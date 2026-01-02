import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { LvZJContent } from '@/lib/lvzj-parser';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Eye, EyeOff, ExternalLink, Loader2, FileText } from 'lucide-react';

interface DynamicPage {
  id: string;
  key: string;
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
}

export default function PageManager() {
  const { user } = useAuth();
  const [pages, setPages] = useState<DynamicPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // New page dialog
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [newPage, setNewPage] = useState({ slug: '', title: '', content: '' });
  
  // Edit page dialog
  const [editPage, setEditPage] = useState<DynamicPage | null>(null);
  const [editedPage, setEditedPage] = useState({ slug: '', title: '', content: '', is_published: true });
  
  // Preview
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('site_content')
      .select('*')
      .like('key', 'page_%')
      .order('key');

    const parsedPages: DynamicPage[] = [];
    for (const item of data || []) {
      try {
        const parsed = JSON.parse(item.content);
        parsedPages.push({
          id: item.id,
          key: item.key,
          slug: item.key.replace('page_', ''),
          title: parsed.title || '',
          content: parsed.content || '',
          is_published: parsed.is_published !== false
        });
      } catch {
        // Skip invalid entries
      }
    }
    setPages(parsedPages);
    setLoading(false);
  };

  const handleCreatePage = async () => {
    if (!newPage.slug.trim() || !newPage.title.trim()) {
      toast.error('Vyplň slug a název');
      return;
    }

    // Validate slug format
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(newPage.slug.trim())) {
      toast.error('Slug může obsahovat pouze malá písmena, čísla a pomlčky');
      return;
    }

    setProcessing(true);

    const pageData = {
      title: newPage.title.trim(),
      content: newPage.content.trim(),
      is_published: true
    };

    const { error } = await supabase
      .from('site_content')
      .insert({
        key: `page_${newPage.slug.trim()}`,
        content: JSON.stringify(pageData),
        updated_by: user?.id
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('Stránka s tímto slugem již existuje');
      } else {
        toast.error('Chyba při vytváření stránky');
      }
    } else {
      toast.success('Stránka vytvořena');
      setNewPage({ slug: '', title: '', content: '' });
      setNewPageOpen(false);
      fetchPages();
    }
    setProcessing(false);
  };

  const handleUpdatePage = async () => {
    if (!editPage) return;

    setProcessing(true);

    const pageData = {
      title: editedPage.title.trim(),
      content: editedPage.content.trim(),
      is_published: editedPage.is_published
    };

    const { error } = await supabase
      .from('site_content')
      .update({
        content: JSON.stringify(pageData),
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      })
      .eq('id', editPage.id);

    if (error) {
      toast.error('Chyba při ukládání');
    } else {
      toast.success('Stránka uložena');
      setEditPage(null);
      fetchPages();
    }
    setProcessing(false);
  };

  const handleTogglePublished = async (page: DynamicPage) => {
    const pageData = {
      title: page.title,
      content: page.content,
      is_published: !page.is_published
    };

    const { error } = await supabase
      .from('site_content')
      .update({
        content: JSON.stringify(pageData),
        updated_at: new Date().toISOString(),
        updated_by: user?.id
      })
      .eq('id', page.id);

    if (error) {
      toast.error('Chyba při změně stavu');
    } else {
      toast.success(page.is_published ? 'Stránka skryta' : 'Stránka publikována');
      fetchPages();
    }
  };

  const handleDeletePage = async (page: DynamicPage) => {
    if (!confirm(`Opravdu smazat stránku "${page.title}"?`)) return;

    const { error } = await supabase
      .from('site_content')
      .delete()
      .eq('id', page.id);

    if (error) {
      toast.error('Chyba při mazání');
    } else {
      toast.success('Stránka smazána');
      fetchPages();
    }
  };

  const openEditDialog = (page: DynamicPage) => {
    setEditPage(page);
    setEditedPage({
      slug: page.slug,
      title: page.title,
      content: page.content,
      is_published: page.is_published
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Dynamické stránky ({pages.length})
        </h3>
        <Dialog open={newPageOpen} onOpenChange={setNewPageOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Nová stránka
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Vytvořit novou stránku</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Slug (URL)</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">/</span>
                    <Input
                      value={newPage.slug}
                      onChange={(e) => setNewPage({ ...newPage, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      placeholder="moje-stranka"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Název</Label>
                  <Input
                    value={newPage.title}
                    onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
                    placeholder="Název stránky"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Obsah (LvZJ)</Label>
                <Textarea
                  value={newPage.content}
                  onChange={(e) => setNewPage({ ...newPage, content: e.target.value })}
                  placeholder="Obsah stránky s LvZJ formátováním..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
              {newPage.content && (
                <div className="space-y-2">
                  <Label>Náhled</Label>
                  <div className="p-4 bg-muted/50 rounded-lg border min-h-[100px]">
                    <LvZJContent content={newPage.content} />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewPageOpen(false)}>Zrušit</Button>
              <Button onClick={handleCreatePage} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Vytvořit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {pages.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Zatím žádné dynamické stránky
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {pages.map((page) => (
            <Card key={page.id} className={!page.is_published ? 'opacity-60' : ''}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {page.title}
                        {!page.is_published && (
                          <Badge variant="secondary" className="text-xs">Skrytá</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">/{page.slug}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPreviewContent(previewContent === page.content ? null : page.content)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(`/${page.slug}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTogglePublished(page)}
                    >
                      {page.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(page)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePage(page)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {previewContent === page.content && (
                  <div className="mt-3 p-4 bg-muted/50 rounded-lg border">
                    <LvZJContent content={page.content} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editPage} onOpenChange={(open) => !open && setEditPage(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upravit stránku</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Slug (URL)</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">/</span>
                  <Input value={editedPage.slug} disabled className="bg-muted" />
                </div>
                <p className="text-xs text-muted-foreground">Slug nelze změnit</p>
              </div>
              <div className="space-y-2">
                <Label>Název</Label>
                <Input
                  value={editedPage.title}
                  onChange={(e) => setEditedPage({ ...editedPage, title: e.target.value })}
                  placeholder="Název stránky"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editedPage.is_published}
                onCheckedChange={(checked) => setEditedPage({ ...editedPage, is_published: checked })}
              />
              <Label>Publikovaná</Label>
            </div>
            <div className="space-y-2">
              <Label>Obsah (LvZJ)</Label>
              <Textarea
                value={editedPage.content}
                onChange={(e) => setEditedPage({ ...editedPage, content: e.target.value })}
                placeholder="Obsah stránky s LvZJ formátováním..."
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            {editedPage.content && (
              <div className="space-y-2">
                <Label>Náhled</Label>
                <div className="p-4 bg-muted/50 rounded-lg border min-h-[100px]">
                  <LvZJContent content={editedPage.content} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPage(null)}>Zrušit</Button>
            <Button onClick={handleUpdatePage} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
