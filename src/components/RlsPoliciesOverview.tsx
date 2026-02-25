import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Check, X, Lock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PolicyInfo {
  table: string;
  select: string;
  insert: string;
  update: string;
  delete: string;
}

const policies: PolicyInfo[] = [
  {
    table: 'profiles',
    select: 'Všichni',
    insert: 'Vlastník (auth.uid = id)',
    update: 'Vlastník (auth.uid = id)',
    delete: '❌ Zakázáno',
  },
  {
    table: 'user_roles',
    select: 'Vlastní role / Organizátor',
    insert: 'Organizátor',
    update: 'Organizátor',
    delete: 'Organizátor',
  },
  {
    table: 'articles',
    select: 'Schválené veřejně / Autor vlastní / Org+Helper',
    insert: 'Autor (auth.uid = author_id)',
    update: 'Autor (pending) / Org+Helper',
    delete: 'Org+Helper',
  },
  {
    table: 'article_ratings',
    select: 'Všichni',
    insert: 'Přihlášený (auth.uid = user_id)',
    update: 'Vlastník',
    delete: '❌ Zakázáno',
  },
  {
    table: 'guessing_games',
    select: 'Aktivní+Resolved veřejně / Org+Helper',
    insert: 'Org+Helper',
    update: 'Org+Helper',
    delete: '❌ Zakázáno',
  },
  {
    table: 'guessing_tips',
    select: 'Po vyhodnocení / Vlastní / Org+Helper',
    insert: 'Přihlášený (aktivní hra)',
    update: 'Vlastník (aktivní hra) / Org+Helper',
    delete: '❌ Zakázáno',
  },
  {
    table: 'messages',
    select: 'Příjemce / Odesílatel',
    insert: 'Org+Helper',
    update: 'Příjemce',
    delete: '❌ Zakázáno',
  },
  {
    table: 'shop_items',
    select: 'Aktivní veřejně / Org+Helper',
    insert: 'Org+Helper',
    update: 'Org+Helper',
    delete: 'Org+Helper',
  },
  {
    table: 'purchases',
    select: 'Vlastní / Org+Helper',
    insert: 'Přihlášený (auth.uid = user_id)',
    update: 'Org+Helper',
    delete: '❌ Zakázáno',
  },
  {
    table: 'site_content',
    select: 'Všichni',
    insert: 'Organizátor',
    update: 'Organizátor',
    delete: '❌ Zakázáno',
  },
  {
    table: 'deletion_requests',
    select: 'Vlastní / Organizátor',
    insert: 'Přihlášený (auth.uid = user_id)',
    update: 'Organizátor',
    delete: '❌ Zakázáno',
  },
  {
    table: 'security_logs',
    select: 'Organizátor',
    insert: '❌ Zakázáno (jen backend)',
    update: '❌ Zakázáno',
    delete: '❌ Zakázáno',
  },
  {
    table: 'oauth_states',
    select: 'Bez RLS omezení',
    insert: 'Bez RLS omezení',
    update: 'Bez RLS omezení',
    delete: 'Bez RLS omezení',
  },
  {
    table: 'system_changelog',
    select: 'Všichni',
    insert: 'Organizátor',
    update: 'Organizátor',
    delete: 'Organizátor',
  },
];

function PolicyBadge({ text }: { text: string }) {
  if (text.includes('❌')) {
    return <Badge variant="destructive" className="text-xs whitespace-normal">{text.replace('❌ ', '')}</Badge>;
  }
  if (text === 'Všichni' || text.includes('veřejně')) {
    return <Badge variant="secondary" className="text-xs whitespace-normal">{text}</Badge>;
  }
  if (text.includes('Organizátor') || text.includes('Org+Helper')) {
    return <Badge className="text-xs whitespace-normal bg-amber-500/20 text-amber-700 border-amber-500/30">{text}</Badge>;
  }
  return <Badge variant="outline" className="text-xs whitespace-normal">{text}</Badge>;
}

export default function RlsPoliciesOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Přehled RLS politik
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-4">
          Přehled Row Level Security politik všech tabulek. RLS je aktivní na všech tabulkách.
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Tabulka</TableHead>
                <TableHead>SELECT</TableHead>
                <TableHead>INSERT</TableHead>
                <TableHead>UPDATE</TableHead>
                <TableHead>DELETE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((p) => (
                <TableRow key={p.table}>
                  <TableCell className="font-mono text-sm font-semibold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-green-600" />
                    {p.table}
                  </TableCell>
                  <TableCell><PolicyBadge text={p.select} /></TableCell>
                  <TableCell><PolicyBadge text={p.insert} /></TableCell>
                  <TableCell><PolicyBadge text={p.update} /></TableCell>
                  <TableCell><PolicyBadge text={p.delete} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 space-y-2 text-sm">
          <h4 className="font-semibold flex items-center gap-1.5">
            <Check className="w-4 h-4 text-green-600" /> Bezpečnostní funkce
          </h4>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li><code className="text-xs">has_role()</code> – SECURITY DEFINER funkce pro kontrolu rolí (zabraňuje rekurzi)</li>
            <li><code className="text-xs">purchase_item()</code> – Atomický nákup přes RPC (uživatel nemůže manipulovat body)</li>
            <li><code className="text-xs">update_points()</code> – Bezpečná aktualizace bodů přes RPC</li>
            <li>Trigger <code className="text-xs">handle_new_user()</code> – Automatické vytvoření profilu + role</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
