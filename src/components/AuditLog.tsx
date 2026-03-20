import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, ScrollText, RefreshCw, Search, Filter, Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface AuditEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changed_by: string | null;
  changed_by_role: string | null;
  created_at: string;
  username?: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Plus; color: string }> = {
  INSERT: { label: 'Vytvoření', icon: Plus, color: 'bg-success/20 text-success' },
  UPDATE: { label: 'Úprava', icon: Pencil, color: 'bg-primary/20 text-primary' },
  DELETE: { label: 'Smazání', icon: Trash2, color: 'bg-destructive/20 text-destructive' },
};

const TABLE_LABELS: Record<string, string> = {
  articles: 'Články',
  profiles: 'Profily',
  guessing_games: 'Tipovačky',
  guessing_tips: 'Tipy',
  shop_items: 'Obchůdek',
  purchases: 'Nákupy',
  user_roles: 'Role',
  site_content: 'Obsah webu',
  seasons: 'Sezóny',
  season_riddles: 'Hádanky',
};

function diffData(oldData: Record<string, any> | null, newData: Record<string, any> | null) {
  if (!oldData || !newData) return null;
  const changes: { key: string; old: any; new: any }[] = [];
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  for (const key of allKeys) {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changes.push({ key, old: oldData[key], new: newData[key] });
    }
  }
  return changes;
}

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/audit_log?order=created_at.desc&limit=500`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${session.data.session?.access_token}`,
          },
        }
      );
      if (!response.ok) { setLoading(false); return; }
      const data = await response.json();

      const userIds = [...new Set(data.filter((e: AuditEntry) => e.changed_by).map((e: AuditEntry) => e.changed_by))] as string[];
      let usernameMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds);
        usernameMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
      }

      setEntries(data.map((e: AuditEntry) => ({ ...e, username: e.changed_by ? usernameMap.get(e.changed_by) : undefined })));
    } catch { }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  };

  const filtered = entries.filter(e => {
    if (tableFilter !== 'all' && e.table_name !== tableFilter) return false;
    if (actionFilter !== 'all' && e.action !== actionFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return e.username?.toLowerCase().includes(q) || e.table_name.includes(q) || e.record_id.includes(q);
    }
    return true;
  });

  const tables = [...new Set(entries.map(e => e.table_name))];

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Hledat uživatele, tabulku..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-full sm:w-44"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny tabulky</SelectItem>
            {tables.map(t => <SelectItem key={t} value={t}>{TABLE_LABELS[t] || t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny akce</SelectItem>
            <SelectItem value="INSERT">Vytvoření</SelectItem>
            <SelectItem value="UPDATE">Úprava</SelectItem>
            <SelectItem value="DELETE">Smazání</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Obnovit
        </Button>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ScrollText className="w-5 h-5" />
            Protokol změn ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Žádné záznamy</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Čas</TableHead>
                    <TableHead>Akce</TableHead>
                    <TableHead>Tabulka</TableHead>
                    <TableHead>Uživatel</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map(entry => {
                    const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.UPDATE;
                    const Icon = config.icon;
                    const changes = entry.action === 'UPDATE' ? diffData(entry.old_data, entry.new_data) : null;

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(new Date(entry.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: cs })}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${config.color} gap-1 border-0`}>
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{TABLE_LABELS[entry.table_name] || entry.table_name}</TableCell>
                        <TableCell>
                          {entry.username ? <span className="text-primary">@{entry.username}</span> : <span className="text-muted-foreground">systém</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{entry.changed_by_role || '-'}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-xs">Zobrazit</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>{config.label} — {TABLE_LABELS[entry.table_name] || entry.table_name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 text-sm">
                                <p className="text-muted-foreground">
                                  {format(new Date(entry.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: cs })} • {entry.username ? `@${entry.username}` : 'systém'} • {entry.changed_by_role}
                                </p>
                                {entry.action === 'UPDATE' && changes && (
                                  <div className="space-y-2">
                                    <h4 className="font-semibold">Změny:</h4>
                                    {changes.map(c => (
                                      <div key={c.key} className="bg-muted/50 p-2 rounded-lg">
                                        <span className="font-mono text-xs font-semibold">{c.key}</span>
                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                          <div className="text-destructive/80 text-xs bg-destructive/5 p-1 rounded overflow-auto max-h-32">
                                            − {JSON.stringify(c.old, null, 2)}
                                          </div>
                                          <div className="text-success text-xs bg-success/5 p-1 rounded overflow-auto max-h-32">
                                            + {JSON.stringify(c.new, null, 2)}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {entry.action === 'INSERT' && entry.new_data && (
                                  <div>
                                    <h4 className="font-semibold mb-1">Nový záznam:</h4>
                                    <pre className="bg-muted/50 p-3 rounded-lg text-xs overflow-auto max-h-64">{JSON.stringify(entry.new_data, null, 2)}</pre>
                                  </div>
                                )}
                                {entry.action === 'DELETE' && entry.old_data && (
                                  <div>
                                    <h4 className="font-semibold mb-1">Smazaný záznam:</h4>
                                    <pre className="bg-muted/50 p-3 rounded-lg text-xs overflow-auto max-h-64">{JSON.stringify(entry.old_data, null, 2)}</pre>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filtered.length > 100 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  Zobrazeno prvních 100 z {filtered.length} záznamů
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
