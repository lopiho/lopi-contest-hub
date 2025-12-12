import { cn } from '@/lib/utils';

interface UserBadgeProps {
  username: string;
  roles?: string[];
  className?: string;
  showAt?: boolean;
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

// Butterfly component
const Butterfly = ({ color }: { color: 'yellow' | 'red' }) => (
  <svg
    viewBox="0 0 24 24"
    className={cn(
      "w-4 h-4 inline-block ml-1",
      color === 'yellow' ? 'text-yellow-500' : 'text-red-500'
    )}
    fill="currentColor"
  >
    <path d="M12 12c-1.5-3-4-5-7-6 0 3 1 5 3 6.5-2 0-4 1-5 3 3 1 5 0 7-2 0 2 1 4 2 6 1-2 2-4 2-6 2 2 4 3 7 2-1-2-3-3-5-3 2-1.5 3-3.5 3-6.5-3 1-5.5 3-7 6z"/>
  </svg>
);

export default function UserBadge({ username, roles = [], className, showAt = true }: UserBadgeProps) {
  const isOrganizer = roles.includes('organizer');
  const isHelper = roles.includes('helper');

  return (
    <span className={cn("inline-flex items-center", className)}>
      {showAt && '@'}{username}
      {isOrganizer && <Butterfly color="yellow" />}
      {isHelper && !isOrganizer && <Butterfly color="red" />}
    </span>
  );
}
