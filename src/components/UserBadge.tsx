import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface UserBadgeProps {
  username: string;
  roles?: string[];
  className?: string;
  showAt?: boolean;
  linkToProfile?: boolean;
}

// Helper function to get role display info
export const getRoleDisplayName = (role: string): string => {
  switch (role) {
    case 'organizer':
      return 'Organizátor';
    case 'helper':
      return 'Pomocníček';
    case 'user':
      return 'Uživatel';
    default:
      return role;
  }
};

export const getRoleBadgeColor = (role: string): string => {
  switch (role) {
    case 'organizer':
      return 'bg-primary text-primary-foreground';
    case 'helper':
      return 'bg-accent text-accent-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

// Crown component
const Crown = ({ color }: { color: 'orange' | 'pink' }) => (
  <svg
    viewBox="0 0 24 24"
    className={cn(
      "w-4 h-4 inline-block ml-1",
      color === 'orange' ? 'text-primary' : 'text-pink-400'
    )}
    fill="currentColor"
  >
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
  </svg>
);

export default function UserBadge({ username, roles = [], className, showAt = true, linkToProfile = true }: UserBadgeProps) {
  const isOrganizer = roles.includes('organizer');
  const isHelper = roles.includes('helper');

  const content = (
    <span className={cn("inline-flex items-center", linkToProfile && "hover:text-primary transition-colors", className)}>
      {showAt && '@'}{username}
      {isOrganizer && <Crown color="orange" />}
      {isHelper && !isOrganizer && <Crown color="pink" />}
    </span>
  );

  if (linkToProfile) {
    return <Link to={`/u/${username}`}>{content}</Link>;
  }

  return content;
}