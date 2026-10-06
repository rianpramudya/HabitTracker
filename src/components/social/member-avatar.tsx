import s from './member-pages.module.css';
export default function MemberAvatar({
  id,
  name,
  version,
  large = false,
}: {
  id: string;
  name: string;
  version: string | null;
  large?: boolean;
}) {
  return (
    <span className={`${s.avatar} ${large ? s.avatarLarge : ''}`} aria-hidden="true">
      {version ? (
        <img src={`/api/social/avatar/${id}?v=${encodeURIComponent(version)}`} alt="" />
      ) : (
        name.trim().slice(0, 1).toLocaleUpperCase()
      )}
    </span>
  );
}
