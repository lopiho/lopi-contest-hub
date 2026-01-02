import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LvZJContent } from '@/lib/lvzj-parser';
import { Loader2 } from 'lucide-react';
import NotFound from './NotFound';

export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading } = useQuery({
    queryKey: ['dynamic-page', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_content')
        .select('*')
        .eq('key', `page_${slug}`)
        .maybeSingle();

      if (error || !data) return null;

      // Parse the content as JSON containing title, content, and is_published
      try {
        const parsed = JSON.parse(data.content);
        return {
          ...parsed,
          id: data.id,
          key: data.key
        };
      } catch {
        return null;
      }
    },
    enabled: !!slug
  });

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!page || !page.is_published) {
    return <NotFound />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {page.title && (
          <h1 className="text-3xl font-display font-bold mb-6">{page.title}</h1>
        )}
        <div className="prose prose-lg max-w-none">
          <LvZJContent content={page.content || ''} />
        </div>
      </div>
    </div>
  );
}
