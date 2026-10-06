'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, ChevronRight, LockKeyhole, Plus, Settings } from 'lucide-react';
import ProductNavigation from '@/components/product-navigation';
import nav from '@/components/dashboard.module.css';
import { balance, finance, localDate, type Command, type State } from '@/modules/tracking/domain';
import { money } from '@/lib/format-money';
import type { FinancialCommand, FinancialSnapshot } from '@/modules/finance/contracts';
import s from './financial.module.css';

type TxType = 'income' | 'expense' | 'transfer';
type Action = Command | FinancialCommand;
const emptyFinancial: FinancialSnapshot = { options: [], bills: [], payments: [] };

export default function FinancialClient({ initial, initialFinancial = emptyFinancial, today, socialAvailable }: {
  initial: State; initialFinancial: FinancialSnapshot; today: string; socialAvailable: boolean;
}) {
  const [state, setState] = useState(initial);
  const [financial, setFinancial] = useState(initialFinancial);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [txType, setTxType] = useState<TxType>('expense');
  const [txName, setTxName] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txWallet, setTxWallet] = useState(initial.wallets.find((w) => !w.archived)?.id ?? '');
  const [txDestination, setTxDestination] = useState('');
  const [txCategory, setTxCategory] = useState('');
  const [txMethod, setTxMethod] = useState('');
  const [walletName, setWalletName] = useState('');
  const [walletOpening, setWalletOpening] = useState('0');
  const [optionName, setOptionName] = useState('');
  const [optionKind, setOptionKind] = useState<'category' | 'method'>('category');
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDue, setBillDue] = useState(today);
  const [billFrequency, setBillFrequency] = useState<'once' | 'weekly' | 'monthly'>('once');
  const [billCategory, setBillCategory] = useState('');
  const [payBill, setPayBill] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payWallet, setPayWallet] = useState(initial.wallets.find((w) => !w.archived)?.id ?? '');
  const [payMethod, setPayMethod] = useState('');
  const retry = useRef<{ payload: string; id: string } | null>(null);
  const lock = useRef(false);
  const lang = state.preferences.language;
  const id = lang === 'id';
  const activeWallets = state.wallets.filter((w) => !w.archived);
  const totalBalance = state.wallets.reduce((sum, w) => sum + balance(state, w.id), 0);
  const from = `${month}-01`;
  const to = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0, 12)).toISOString().slice(0, 10);
  const totals = finance(state, from, to);
  const monthEntries = state.entries.filter((e) => !e.deleted && e.type !== 'log' && e.date >= from && e.date <= to)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id));
  const expenses = Object.entries(monthEntries.filter((e) => e.type === 'expense').reduce<Record<string, number>>((acc, e) => {
    acc[e.category || (id ? 'Tanpa kategori' : 'Uncategorized')] = (acc[e.category || (id ? 'Tanpa kategori' : 'Uncategorized')] ?? 0) + e.amount;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  const categories = financial.options.filter((o) => o.kind === 'category' && !o.archived);
  const methods = financial.options.filter((o) => o.kind === 'method' && !o.archived);

  useEffect(() => { document.documentElement.dataset.theme = state.preferences.theme; document.documentElement.lang = lang; }, [state.preferences.theme, lang]);
  async function run(command: Action): Promise<boolean> {
    if (lock.current) return false;
    const payload = JSON.stringify(command);
    if (retry.current?.payload !== payload) retry.current = { payload, id: crypto.randomUUID() };
    lock.current = true;
    setPending(true); setError(''); setMessage('');
    const isCore = command.action.startsWith('entry.') || command.action.startsWith('wallet.') && command.action !== 'wallet.rename';
    try {
      const response = await fetch(isCore ? '/api/commands' : '/api/financial', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': retry.current.id }, body: payload,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? (id ? 'Gagal menyimpan' : 'Could not save'));
      setState(result.state as State);
      if (result.financial) setFinancial(result.financial as FinancialSnapshot);
      retry.current = null;
      setMessage(id ? 'Tersimpan. Saldo dan ringkasan sudah diperbarui.' : 'Saved. Balances and summary are updated.');
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (id ? 'Gagal menyimpan. Coba lagi.' : 'Could not save. Try again.'));
      return false;
    } finally { lock.current = false; setPending(false); }
  }
  async function saveTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(txAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0) { setError(id ? 'Nominal harus bilangan bulat positif.' : 'Amount must be a positive integer.'); return; }
    const now = new Date();
    const ok = await run({ action: 'entry.create', entry: {
      module: 'finance', date: localDate(now, state.preferences.timezone), occurredAt: now.toISOString(), timezone: state.preferences.timezone,
      name: txName.trim() || (txType === 'transfer' ? 'Transfer antarkantong' : txType === 'income' ? 'Pemasukan' : 'Pengeluaran'), amount,
      habitId: null, type: txType, walletId: txWallet, destinationId: txType === 'transfer' ? txDestination : null,
      category: txType === 'transfer' ? '' : txCategory.trim(), method: txMethod.trim(), note: '',
    } });
    if (ok) { setTxName(''); setTxAmount(''); }
  }
  async function saveWallet(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const opening = Number(walletOpening);
    if (!Number.isSafeInteger(opening)) { setError(id ? 'Saldo awal harus bilangan bulat.' : 'Opening balance must be an integer.'); return; }
    if (await run({ action: 'wallet.create', name: walletName.trim(), opening })) { setWalletName(''); setWalletOpening('0'); }
  }
  async function saveBill(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(billAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0) { setError(id ? 'Nominal tagihan tidak valid.' : 'Invalid bill amount.'); return; }
    if (await run({ action: 'bill.create', name: billName.trim(), amount, dueDate: billDue, frequency: billFrequency, category: billCategory.trim(), note: '' })) {
      setBillName(''); setBillAmount(''); setBillCategory('');
    }
  }
  async function savePayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(payAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0) { setError(id ? 'Nominal pembayaran tidak valid.' : 'Invalid payment amount.'); return; }
    if (await run({ action: 'bill.pay', id: payBill, amount, walletId: payWallet, method: payMethod.trim() })) { setPayBill(''); setPayAmount(''); }
  }
  return <div className={nav.shell}>
    <a className={nav.skip} href="#main">{id ? 'Lewati navigasi' : 'Skip navigation'}</a>
    <ProductNavigation active="finance" language={lang} name={state.preferences.name} socialAvailable={socialAvailable} />
    <div className={nav.workspace}><main id="main" className={`${nav.main} ${s.main}`} tabIndex={-1}>
      <header className={s.header}><div><span className={s.eyebrow}>{id ? 'Ruang keuangan pribadi' : 'Your personal money space'}</span><h1>Financial<span className={s.periodDot}>.</span></h1><p>{id ? 'Lihat arus uangmu dengan jelas, satu catatan pada satu waktu.' : 'See your money move, one record at a time.'}</p></div><div className={s.headerTools}><span><LockKeyhole size={15} aria-hidden /> {id ? 'Privat' : 'Private'}</span><Link href="/dashboard?view=settings" aria-label={id ? 'Pengaturan' : 'Settings'}><Settings size={20} aria-hidden /></Link></div></header>
      {pending && <p className={s.pending} role="status">{id ? 'Menyimpan…' : 'Saving…'}</p>}
      {error && <p className={s.error} role="alert">{error}</p>}
      {message && <p className={s.success} role="status"><Check size={18} aria-hidden /> {message}</p>}
      <section className={s.overview} aria-label={id ? 'Ringkasan keuangan' : 'Financial summary'}>
        <div className={s.balanceBlock}><small>{id ? 'Total saldo tercatat' : 'Recorded balance'}</small><strong>{money(totalBalance, lang)}</strong><span>{id ? 'Dari seluruh kantong, termasuk yang diarsipkan.' : 'Across all pockets, including archived ones.'}</span></div>
        <div className={s.periodBlock}><label htmlFor="finance-month">{id ? 'Periode laporan' : 'Report period'}</label><input id="finance-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /><div><span><ArrowDownLeft size={17} aria-hidden /> {id ? 'Masuk' : 'Income'} <b>{money(totals.income, lang)}</b></span><span><ArrowUpRight size={17} aria-hidden /> {id ? 'Keluar' : 'Expense'} <b>{money(totals.expense, lang)}</b></span></div></div>
      </section>
      <div className={s.columns}>
        <div className={s.flow}>
          <section className={s.section} aria-labelledby="transaction-title"><div className={s.sectionHeading}><div><span className={s.eyebrow}>01 / {id ? 'Catat' : 'Record'}</span><h2 id="transaction-title">{id ? 'Transaksi baru' : 'New transaction'}</h2></div></div>
            <form className={s.form} onSubmit={saveTransaction}>
              <div className={s.segmented} role="group" aria-label={id ? 'Jenis transaksi' : 'Transaction type'}>{(['expense','income','transfer'] as const).map((type) => <button key={type} type="button" aria-pressed={txType===type} onClick={() => setTxType(type)}>{type==='expense' ? id?'Pengeluaran':'Expense' : type==='income' ? id?'Pemasukan':'Income' : id?'Transfer':'Transfer'}</button>)}</div>
              <div className={s.formGrid}><label>{id ? 'Nama catatan' : 'Description'}<input value={txName} onChange={(e)=>setTxName(e.target.value)} maxLength={100} placeholder={txType==='transfer' ? 'Transfer antarkantong' : id?'Contoh: Belanja harian':'Example: Groceries'} /></label><label>{id ? 'Nominal (IDR)' : 'Amount (IDR)'}<input value={txAmount} onChange={(e)=>setTxAmount(e.target.value)} inputMode="numeric" type="number" min="1" step="1" required /></label><label>{txType==='transfer' ? id?'Dari kantong':'From pocket' : id?'Kantong':'Pocket'}<select value={txWallet} onChange={(e)=>setTxWallet(e.target.value)} required><option value="">{id?'Pilih kantong':'Select pocket'}</option>{activeWallets.map((w)=><option value={w.id} key={w.id}>{w.name}</option>)}</select></label>{txType==='transfer' ? <label>{id?'Ke kantong':'To pocket'}<select value={txDestination} onChange={(e)=>setTxDestination(e.target.value)} required><option value="">{id?'Pilih tujuan':'Select destination'}</option>{activeWallets.filter((w)=>w.id!==txWallet).map((w)=><option value={w.id} key={w.id}>{w.name}</option>)}</select></label> : <label>{id?'Kategori':'Category'}<input list="finance-categories" value={txCategory} onChange={(e)=>setTxCategory(e.target.value)} maxLength={60} required /><datalist id="finance-categories">{categories.map((o)=><option value={o.name} key={o.id} />)}</datalist></label>}<label>{id?'Metode pembayaran':'Payment method'}<input list="finance-methods" value={txMethod} onChange={(e)=>setTxMethod(e.target.value)} maxLength={60} required /><datalist id="finance-methods">{['Tunai','Debit','Transfer bank','Lainnya',...methods.map((o)=>o.name)].map((value)=><option value={value} key={value} />)}</datalist></label></div>
              <button className={s.primary} type="submit" disabled={pending || !activeWallets.length}><Plus size={18} aria-hidden /> {id?'Simpan transaksi':'Save transaction'}</button>
            </form>
          </section>
          <section className={s.section} aria-labelledby="pockets-title"><div className={s.sectionHeading}><div><span className={s.eyebrow}>02 / {id?'Atur':'Organize'}</span><h2 id="pockets-title">{id?'Kantong':'Pockets'}</h2></div><span>{state.wallets.length}</span></div>
            {state.wallets.length ? <div className={s.walletList}>{state.wallets.map((w)=><div className={s.walletRow} key={w.id}><div><strong>{w.name}</strong><small>{w.archived ? id?'Diarsipkan':'Archived' : id?'Aktif':'Active'}</small></div><b>{money(balance(state,w.id),lang)}</b>{!w.archived && <div className={s.walletActions}><button type="button" disabled={pending} onClick={()=>{const name=window.prompt(id?'Nama kantong baru':'New pocket name',w.name); if(name && name.trim()!==w.name) void run({action:'wallet.rename',id:w.id,name:name.trim()});}}>{id?'Ubah nama':'Rename'}</button><button type="button" disabled={pending} onClick={()=>{if(window.confirm(id?'Arsipkan kantong ini? Riwayat tetap tersimpan.':'Archive this pocket? History stays available.')) void run({action:'wallet.archive',id:w.id});}}>{id?'Arsip':'Archive'}</button></div>}</div>)}</div> : <p className={s.empty}>{id?'Belum ada kantong. Buat kantong pertama sebelum mencatat transaksi.':'No pockets yet. Create one to record transactions.'}</p>}
            <form className={s.inlineForm} onSubmit={saveWallet}><label>{id?'Nama kantong':'Pocket name'}<input value={walletName} onChange={(e)=>setWalletName(e.target.value)} maxLength={60} required /></label><label>{id?'Saldo awal (IDR)':'Opening balance (IDR)'}<input value={walletOpening} onChange={(e)=>setWalletOpening(e.target.value)} type="number" step="1" required /></label><button className={s.secondary} type="submit" disabled={pending}><Plus size={18} aria-hidden /> {id?'Tambah kantong':'Add pocket'}</button></form>
          </section>
          <section className={s.section} aria-labelledby="ledger-title"><div className={s.sectionHeading}><div><span className={s.eyebrow}>03 / Ledger</span><h2 id="ledger-title">{id?'Riwayat keuangan':'Financial ledger'}</h2></div><Link href="/dashboard?view=history">{id?'Semua aktivitas':'All activity'} <ChevronRight size={16} aria-hidden /></Link></div>
            {monthEntries.length ? <ol className={s.ledger}>{monthEntries.map((e)=><li key={e.id}><span className={s.ledgerIcon}>{e.type==='income'?<ArrowDownLeft size={18} aria-hidden />:e.type==='transfer'?<ArrowLeftRight size={18} aria-hidden />:<ArrowUpRight size={18} aria-hidden />}</span><div><strong>{e.name}</strong><small>{e.date} · {e.type==='transfer'?id?'Transfer internal':'Internal transfer':e.category} · {e.method}</small></div><b className={e.type==='income'?s.income:''}>{e.type==='income'?'+':e.type==='expense'?'-':''}{money(e.amount,lang)}</b></li>)}</ol> : <p className={s.empty}>{id?'Belum ada transaksi tercatat pada periode ini.':'No recorded transactions in this period.'}</p>}
          </section>
        </div>
        <div className={s.side}>
          <section className={s.section} aria-labelledby="stats-title"><div className={s.sectionHeading}><div><span className={s.eyebrow}>{id?'Analisis periode':'Period analysis'}</span><h2 id="stats-title">{id?'Pengeluaran per kategori':'Expense by category'}</h2></div></div>{expenses.length ? <div className={s.stats}>{expenses.map(([category,value])=><div key={category}><div><span>{category}</span><b>{money(value,lang)}</b></div><div className={s.bar}><i style={{width:`${Math.round(value/totals.expense*100)}%`}} /></div></div>)}</div> : <p className={s.empty}>{id?'Belum ada pengeluaran tercatat pada periode ini.':'No expenses recorded in this period.'}</p>}</section>
          <section className={s.section} aria-labelledby="bills-title"><div className={s.sectionHeading}><div><span className={s.eyebrow}>{id?'Kewajiban':'Obligations'}</span><h2 id="bills-title">{id?'Cicilan & tagihan':'Bills & installments'}</h2></div></div><p className={s.hint}>{id?'Pencatatan saja. Tidak memindahkan uang di bank atau membayar penyedia tagihan. Jadwal tidak membuat tagihan baru otomatis.':'Bookkeeping only. No bank transfer or provider payment. Recurrence does not create new bills automatically.'}</p>
            {financial.bills.filter((b)=>!b.archived).length ? <div className={s.billList}>{financial.bills.filter((b)=>!b.archived).map((b)=>{const remaining=b.amount-b.paid;return <article key={b.id} className={s.bill}><div><strong>{b.name}</strong><small>{id?'Jatuh tempo':'Due'} {b.dueDate} · {b.frequency==='once'?id?'Sekali':'Once':b.frequency==='weekly'?id?'Mingguan':'Weekly':id?'Bulanan':'Monthly'}</small></div><b>{money(remaining,lang)}</b><span>{remaining===0 ? id?'Lunas':'Paid' : `${money(b.paid,lang)} / ${money(b.amount,lang)} ${id?'tercatat':'recorded'}`}</span>{remaining>0 && <button type="button" onClick={()=>{setPayBill(b.id);setPayAmount(String(remaining));document.getElementById('bill-payment')?.scrollIntoView({behavior:'smooth'});}}>{id?'Catat pembayaran':'Record payment'}</button>}</article>;})}</div> : <p className={s.empty}>{id?'Belum ada tagihan tercatat.':'No bills recorded yet.'}</p>}
            <form className={s.form} onSubmit={saveBill}><h3>{id?'Tambah tagihan':'Add bill'}</h3><div className={s.formGrid}><label>{id?'Nama tagihan':'Bill name'}<input value={billName} onChange={(e)=>setBillName(e.target.value)} maxLength={100} required /></label><label>{id?'Total kewajiban (IDR)':'Total obligation (IDR)'}<input value={billAmount} onChange={(e)=>setBillAmount(e.target.value)} type="number" min="1" step="1" required /></label><label>{id?'Jatuh tempo':'Due date'}<input value={billDue} onChange={(e)=>setBillDue(e.target.value)} type="date" required /></label><label>{id?'Jadwal':'Schedule'}<select value={billFrequency} onChange={(e)=>setBillFrequency(e.target.value as 'once'|'weekly'|'monthly')}><option value="once">{id?'Sekali':'Once'}</option><option value="weekly">{id?'Mingguan':'Weekly'}</option><option value="monthly">{id?'Bulanan':'Monthly'}</option></select></label><label>{id?'Kategori':'Category'}<input list="finance-categories" value={billCategory} onChange={(e)=>setBillCategory(e.target.value)} maxLength={60} required /></label></div><button className={s.secondary} type="submit" disabled={pending}>{id?'Simpan tagihan':'Save bill'}</button></form>
            <form className={s.form} id="bill-payment" onSubmit={savePayment}><h3>{id?'Catat pembayaran sebagian atau penuh':'Record partial or full payment'}</h3><div className={s.formGrid}><label>{id?'Tagihan':'Bill'}<select value={payBill} onChange={(e)=>setPayBill(e.target.value)} required><option value="">{id?'Pilih tagihan':'Select bill'}</option>{financial.bills.filter((b)=>!b.archived&&b.amount>b.paid).map((b)=><option value={b.id} key={b.id}>{b.name} · {money(b.amount-b.paid,lang)}</option>)}</select></label><label>{id?'Nominal (IDR)':'Amount (IDR)'}<input value={payAmount} onChange={(e)=>setPayAmount(e.target.value)} type="number" min="1" step="1" required /></label><label>{id?'Dari kantong':'From pocket'}<select value={payWallet} onChange={(e)=>setPayWallet(e.target.value)} required><option value="">{id?'Pilih kantong':'Select pocket'}</option>{activeWallets.map((w)=><option value={w.id} key={w.id}>{w.name}</option>)}</select></label><label>{id?'Metode':'Method'}<input list="finance-methods" value={payMethod} onChange={(e)=>setPayMethod(e.target.value)} maxLength={60} required /></label></div><button className={s.primary} type="submit" disabled={pending||!payBill}>{id?'Simpan pembayaran':'Save payment'}</button></form>
          </section>
          <section className={s.section} aria-labelledby="options-title"><div className={s.sectionHeading}><div><span className={s.eyebrow}>{id?'Personalisasi':'Personalize'}</span><h2 id="options-title">{id?'Kategori & metode':'Categories & methods'}</h2></div></div><div className={s.chips}>{financial.options.filter((o)=>!o.archived).map((o)=><span key={o.id}>{o.name} <small>{o.kind==='category'?id?'Kategori':'Category':id?'Metode':'Method'}</small><button type="button" disabled={pending} aria-label={`${id?'Arsipkan':'Archive'} ${o.name}`} onClick={()=>{if(window.confirm(`${id?'Arsipkan':'Archive'} ${o.name}?`)) void run({action:'option.archive',id:o.id});}}>×</button></span>)}</div><form className={s.inlineForm} onSubmit={async(e)=>{e.preventDefault();if(await run({action:'option.create',kind:optionKind,name:optionName.trim()}))setOptionName('');}}><label>{id?'Jenis':'Type'}<select value={optionKind} onChange={(e)=>setOptionKind(e.target.value as 'category'|'method')}><option value="category">{id?'Kategori':'Category'}</option><option value="method">{id?'Metode':'Method'}</option></select></label><label>{id?'Nama':'Name'}<input value={optionName} onChange={(e)=>setOptionName(e.target.value)} maxLength={60} required /></label><button className={s.secondary} type="submit" disabled={pending}><Plus size={18} aria-hidden /> {id?'Tambah':'Add'}</button></form></section>
        </div>
      </div>
    </main></div>
  </div>;
}
