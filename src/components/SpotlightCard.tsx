import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { FileText, User, HelpCircle, ShoppingBag, ExternalLink, Megaphone } from 'lucide-react';

interface Spotlight {
  id: string;
  type: string;
  title: string;
  description: string | null;
  link: string | null;
  image_url: string | null;
  color: string | null;
  is_active: boolean;
}

const typeIcons: Record<string, typeof FileText> = {
  article: FileText,
  user: User,
  game: HelpCircle,
  shop_item: ShoppingBag,
  custom: Megaphone,
};

const typeLabels: Record<string, string> = {
  article: 'Článek',
  user: 'Člověk',
  game: 'Tipovačka',
  shop_item: 'Obchůdek',
  custom: 'Poutání',
};

export default function SpotlightCard({ spotlight }: { spotlight: Spotlight }) {
  const Icon = typeIcons[spotlight.type] || Megaphone;
  const isExternal = spotlight.link?.startsWith('http');
  const isAlik = spotlight.link?.includes('alik.cz');
  
  const bgStyle = spotlight.color
    ? { background: spotlight.color }
    : {};

  const content = (
    <Card
      className="overflow-hidden card-hover border-0 shadow-card group relative"
      style={bgStyle}
    >
      {spotlight.image_url && (
        <div className="h-36 overflow-hidden">
          <img
            src={spotlight.image_url}
            alt={spotlight.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <CardContent className={`p-4 ${spotlight.image_url ? '' : 'pt-4'}`}>
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isAlik
                ? 'bg-[#EBF8BC]'
                : spotlight.color
                ? 'bg-background/20'
                : 'bg-primary/10'
            }`}
          >
            <Icon className={`w-5 h-5 ${spotlight.color ? 'text-foreground' : 'text-primary'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {typeLabels[spotlight.type] || 'Poutání'}
              </span>
              {isExternal && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
            </div>
            <h3 className="font-display font-bold text-sm leading-tight truncate">
              {spotlight.title}
            </h3>
            {spotlight.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {spotlight.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
      {isAlik && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{
            background: 'linear-gradient(90deg, #ED6A00, #38D, #8A0, #B4E, #FC0)',
          }}
        />
      )}
    </Card>
  );

  if (!spotlight.link) return content;

  if (isExternal) {
    return (
      <a href={spotlight.link} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return <Link to={spotlight.link}>{content}</Link>;
}
