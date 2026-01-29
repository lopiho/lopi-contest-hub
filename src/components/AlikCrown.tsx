import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Import crown images
import crownBlue from '@/assets/crowns/korunka-modra.png';
import crownGreen from '@/assets/crowns/korunka-zelena.png';
import crownRed001 from '@/assets/crowns/korunka-cervena-001.png';
import crownRed010 from '@/assets/crowns/korunka-cervena-010.png';
import crownRed011 from '@/assets/crowns/korunka-cervena-011.png';
import crownRed100 from '@/assets/crowns/korunka-cervena-100.png';
import crownRed101 from '@/assets/crowns/korunka-cervena-101.png';
import crownRed110 from '@/assets/crowns/korunka-cervena-110.png';
import crownRed111 from '@/assets/crowns/korunka-cervena-111.png';

export interface AlikRoles {
  isAdmin?: boolean;      // Blue crown - Zvěrolékař Alíka
  isHelper?: boolean;     // Green crown - Správce Alíka
  isEditor?: boolean;     // Red left tip (100) - Redaktor Alíka
  isClubManager?: boolean; // Red middle tip (010) - Správce klubovny
  isBoardManager?: boolean; // Red right tip (001) - Správce nástěnek
  isJester?: boolean;     // Jester crown - Alíkův šašek
}

interface AlikCrownProps {
  roles: AlikRoles;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Map red crown combinations to images
const getRedCrownImage = (editor: boolean, club: boolean, board: boolean): string | null => {
  const code = `${editor ? '1' : '0'}${club ? '1' : '0'}${board ? '1' : '0'}`;
  
  switch (code) {
    case '001': return crownRed001;
    case '010': return crownRed010;
    case '011': return crownRed011;
    case '100': return crownRed100;
    case '101': return crownRed101;
    case '110': return crownRed110;
    case '111': return crownRed111;
    default: return null;
  }
};

// Get role description for tooltip
const getRoleDescription = (roles: AlikRoles): string[] => {
  const descriptions: string[] = [];
  
  if (roles.isAdmin) descriptions.push('Zvěrolékař Alíka');
  if (roles.isHelper) descriptions.push('Správce Alíka');
  if (roles.isJester) descriptions.push('Alíkův šašek');
  if (roles.isEditor) descriptions.push('Redaktor Alíka');
  if (roles.isClubManager) descriptions.push('Správce klubovny');
  if (roles.isBoardManager) descriptions.push('Správce nástěnek');
  
  return descriptions;
};

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export default function AlikCrown({ roles, className, size = 'sm' }: AlikCrownProps) {
  const crowns: { src: string; alt: string; priority: number }[] = [];
  
  // Blue crown (highest priority - admin)
  if (roles.isAdmin) {
    crowns.push({ src: crownBlue, alt: 'Zvěrolékař Alíka', priority: 1 });
  }
  
  // Green crown (helper)
  if (roles.isHelper && !roles.isAdmin) {
    crowns.push({ src: crownGreen, alt: 'Správce Alíka', priority: 2 });
  }
  
  // Red crown (editorial roles)
  const hasRedRole = roles.isEditor || roles.isClubManager || roles.isBoardManager;
  if (hasRedRole) {
    const redCrown = getRedCrownImage(
      roles.isEditor || false,
      roles.isClubManager || false,
      roles.isBoardManager || false
    );
    if (redCrown) {
      const redRoles: string[] = [];
      if (roles.isEditor) redRoles.push('Redaktor');
      if (roles.isClubManager) redRoles.push('Správce klubovny');
      if (roles.isBoardManager) redRoles.push('Správce nástěnek');
      crowns.push({ src: redCrown, alt: redRoles.join(', '), priority: 3 });
    }
  }
  
  // TODO: Jester crown when image is provided
  // if (roles.isJester) {
  //   crowns.push({ src: crownJester, alt: 'Alíkův šašek', priority: 4 });
  // }
  
  if (crowns.length === 0) return null;
  
  const descriptions = getRoleDescription(roles);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-0.5", className)}>
            {crowns.map((crown, index) => (
              <img
                key={index}
                src={crown.src}
                alt={crown.alt}
                className={cn(sizeClasses[size], "inline-block")}
              />
            ))}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            {descriptions.map((desc, i) => (
              <div key={i}>{desc}</div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Helper to parse Alík roles from OAuth data or stored metadata
export function parseAlikRoles(alikRolesData: string | string[] | null | undefined): AlikRoles {
  if (!alikRolesData) return {};
  
  const roles = Array.isArray(alikRolesData) ? alikRolesData : [alikRolesData];
  
  return {
    isAdmin: roles.includes('admin') || roles.includes('zvěrolékař'),
    isHelper: roles.includes('helper') || roles.includes('správce'),
    isEditor: roles.includes('editor') || roles.includes('redaktor'),
    isClubManager: roles.includes('club_manager') || roles.includes('klubovna'),
    isBoardManager: roles.includes('board_manager') || roles.includes('nástěnky'),
    isJester: roles.includes('jester') || roles.includes('šašek'),
  };
}
