import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Edit, Save, X, Trash2, AlertTriangle, FileText, Shield, Eye } from "lucide-react";
import { LvZJContent } from "@/lib/lvzj-parser";

// Výchozí text pravidel s LvZJ formátováním
const DEFAULT_PRAVIDLA = `(nadpis)Pravidla soutěže

(tučně)1. Základní ustanovení
Tato pravidla upravují podmínky účasti v soutěži a způsob hodnocení účastníků.

(tučně)2. Podmínky účasti
(boxík)Pro účast v soutěži je nutné být registrovaným uživatelem na webu alik.cz!(konec boxíku)

• Účastník musí být registrován na této soutěžní platformě
• Účastník musí mít aktivní účet na webu alik.cz
• Jedna osoba může mít pouze jeden soutěžní účet
• Účastí v soutěži účastník souhlasí s těmito pravidly

(tučně)3. Bodový systém
Body lze získat následujícími způsoby:

(tučně červeně)Článkovnice:
• 5 bodů – základní odměna za publikovaný článek
• 0-5 bodů – bonus podle průměrného hodnocení
• 1 bod za každé 2 hodnocení (max. 10 bodů za aktivitu)

(tučně modře)Tipovačky:
• Body dle nastavení organizátora za správný tip
• Pouze jeden tip na hru

(tučně)4. Hodnocení článků
• Články hodnotí ostatní účastníci na stupnici 1-10
• Hodnocení probíhá po schválení článku organizátorem
• Vlastní článek nelze hodnotit

(tučně)5. Obchůdek
• Za nasbírané body lze nakupovat v obchůdku
• Ceny určuje organizátor
• Nákup je nevratný

(tučně)6. Práva a povinnosti účastníků
• Chovat se slušně a respektovat ostatní
• Nepodvádět a nemanipulovat s body
• Nepoužívat vulgární nebo urážlivý obsah
• Respektovat autorská práva

(tučně)7. Práva organizátora
• Organizátor může upravit pravidla soutěže
• Organizátor může vyloučit účastníka za porušení pravidel
• Organizátor rozhoduje o výhrách a sporných situacích

(tučně)8. Závěrečná ustanovení
Účastí v soutěži vyjadřujete souhlas s těmito pravidly.`;

// Výchozí text ochrany OU s LvZJ formátováním
const DEFAULT_OCHRANA_OU = `(nadpis)Ochrana osobních údajů

(tučně)1. Správce údajů
Správcem vašich osobních údajů je organizátor této soutěže.

(tučně)2. Zpracovávané údaje
V rámci soutěže zpracováváme tyto údaje:
• E-mailová adresa (pro přihlášení a komunikaci)
• Uživatelské jméno (veřejně zobrazováno)
• Volitelně: avatar a bio
• Obsah vytvořený uživatelem (články, tipy, hodnocení, zprávy)
• Body a historie nákupů
• Role v systému

(tučně)3. Účel zpracování
Vaše údaje zpracováváme za účelem:
• Umožnění účasti v soutěži
• Zobrazení na žebříčku a v profilu
• Provoz obchůdku
• Komunikace mezi účastníky a organizátory
• Moderace obsahu

(tučně)4. Právní základ
Zpracování probíhá na základě vašeho souhlasu (registrací do soutěže) a oprávněného zájmu organizátora.

(tučně)5. Doba uchování
Údaje uchováváme po dobu trvání soutěže a následně až 3 roky pro případné reklamace a archivaci.

(tučně)6. Vaše práva
Máte právo na:
• Přístup ke svým údajům
• Opravu nepřesných údajů
• Výmaz údajů (právo být zapomenut)
• Omezení zpracování
• Přenositelnost údajů
• Vznesení námitky
• Podání stížnosti u ÚOOÚ

(boxík)Pro uplatnění práv kontaktujte organizátora nebo využijte formulář níže.(konec boxíku)

(tučně)7. Žádost o smazání údajů
Po podání žádosti budou:
• Anonymizovány údaje ve vašem profilu
• Smazány vaše články, tipy a hodnocení
• Odstraněna historie nákupů
• Zrušen váš účet

(tučně)8. Zabezpečení údajů
• Data jsou uložena na zabezpečených serverech
• Komunikace probíhá přes šifrované spojení (HTTPS)
• Přístup k údajům mají pouze oprávněné osoby

(tučně)9. Cookies
Používáme pouze nezbytné technické cookies pro fungování webu.

(tučně)10. Změny podmínek
O změnách v ochraně osobních údajů budete informováni na webu.`;

const PravidlaOchranaOU = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [pravidla, setPravidla] = useState("");
  const [ochranaOU, setOchranaOU] = useState("");
  const [editingPravidla, setEditingPravidla] = useState(false);
  const [editingOchrana, setEditingOchrana] = useState(false);
  const [editedPravidla, setEditedPravidla] = useState("");
  const [editedOchrana, setEditedOchrana] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [myRequest, setMyRequest] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchContent();
    if (user) {
      fetchMyRequest();
      checkRole();
    }
  }, [user]);

  const checkRole = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id);
    
    const hasOrgRole = data?.some(r => r.role === 'organizer' || r.role === 'helper');
    setIsOrganizer(hasOrgRole || false);
  };

  const fetchContent = async () => {
    const { data, error } = await supabase
      .from('site_content')
      .select('*');
    
    if (data) {
      const pravidlaContent = data.find(c => c.key === 'pravidla');
      const ochranaContent = data.find(c => c.key === 'ochrana_ou');
      
      // Použít výchozí texty, pokud v DB nic není
      setPravidla(pravidlaContent?.content || DEFAULT_PRAVIDLA);
      setOchranaOU(ochranaContent?.content || DEFAULT_OCHRANA_OU);
    } else {
      // Pokud selže načtení, použít výchozí
      setPravidla(DEFAULT_PRAVIDLA);
      setOchranaOU(DEFAULT_OCHRANA_OU);
    }
    setLoading(false);
  };

  const fetchMyRequest = async () => {
    const { data } = await supabase
      .from('deletion_requests')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', 'pending')
      .maybeSingle();
    
    setMyRequest(data);
  };

  const handleSave = async (key: string, content: string) => {
    const { error } = await supabase
      .from('site_content')
      .update({ content, updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq('key', key);

    if (error) {
      toast({ title: "Chyba při ukládání", variant: "destructive" });
    } else {
      toast({ title: "Uloženo" });
      if (key === 'pravidla') {
        setPravidla(content);
        setEditingPravidla(false);
      } else {
        setOchranaOU(content);
        setEditingOchrana(false);
      }
    }
  };

  const handleDeleteRequest = async () => {
    if (!user) return;
    
    setSubmitting(true);
    
    // Create deletion request
    const { error: requestError } = await supabase
      .from('deletion_requests')
      .insert({
        user_id: user.id,
        reason: deleteReason || 'Bez udání důvodu'
      });

    if (requestError) {
      toast({ title: "Chyba při odesílání žádosti", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Send message to all organizers
    const { data: organizers } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'organizer');

    if (organizers) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      for (const org of organizers) {
        await supabase.from('messages').insert({
          sender_id: user.id,
          recipient_id: org.user_id,
          subject: '🗑️ Žádost o smazání údajů',
          content: `Uživatel ${profile?.username || 'Neznámý'} žádá o smazání všech svých osobních údajů.\n\nDůvod: ${deleteReason || 'Bez udání důvodu'}\n\nŽádost můžete vyřídit v administraci.`
        });
      }
    }

    toast({ title: "Žádost odeslána", description: "Organizátoři byli informováni." });
    setDeleteDialogOpen(false);
    setDeleteReason("");
    fetchMyRequest();
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Načítání...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Pravidla a ochrana osobních údajů</h1>
      
      <Tabs defaultValue="pravidla" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pravidla" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Pravidla soutěže
          </TabsTrigger>
          <TabsTrigger value="ochrana" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Ochrana osobních údajů
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pravidla">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pravidla soutěže</CardTitle>
                <CardDescription>Pravidla a podmínky účasti v soutěži</CardDescription>
              </div>
              {isOrganizer && !editingPravidla && (
                <Button variant="outline" size="sm" onClick={() => {
                  setEditedPravidla(pravidla);
                  setEditingPravidla(true);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Upravit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingPravidla ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Editor (LvZJ formátování)</p>
                      <Textarea 
                        value={editedPravidla}
                        onChange={(e) => setEditedPravidla(e.target.value)}
                        className="min-h-[400px] font-mono text-sm"
                        placeholder="Napište pravidla soutěže s LvZJ formátováním..."
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Eye className="h-4 w-4" /> Náhled
                      </p>
                      <div className="border rounded-md p-4 min-h-[400px] overflow-auto bg-muted/30">
                        <LvZJContent content={editedPravidla} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSave('pravidla', editedPravidla)}>
                      <Save className="h-4 w-4 mr-2" />
                      Uložit
                    </Button>
                    <Button variant="outline" onClick={() => setEditingPravidla(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Zrušit
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <LvZJContent content={pravidla} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ochrana">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Ochrana osobních údajů</CardTitle>
                <CardDescription>Informace o zpracování osobních údajů (GDPR)</CardDescription>
              </div>
              {isOrganizer && !editingOchrana && (
                <Button variant="outline" size="sm" onClick={() => {
                  setEditedOchrana(ochranaOU);
                  setEditingOchrana(true);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Upravit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingOchrana ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Editor (LvZJ formátování)</p>
                      <Textarea 
                        value={editedOchrana}
                        onChange={(e) => setEditedOchrana(e.target.value)}
                        className="min-h-[400px] font-mono text-sm"
                        placeholder="Napište informace o ochraně osobních údajů s LvZJ formátováním..."
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Eye className="h-4 w-4" /> Náhled
                      </p>
                      <div className="border rounded-md p-4 min-h-[400px] overflow-auto bg-muted/30">
                        <LvZJContent content={editedOchrana} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSave('ochrana_ou', editedOchrana)}>
                      <Save className="h-4 w-4 mr-2" />
                      Uložit
                    </Button>
                    <Button variant="outline" onClick={() => setEditingOchrana(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Zrušit
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <LvZJContent content={ochranaOU} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deletion request section for logged in users */}
          {user && !isOrganizer && (
            <Card className="mt-6 border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Žádost o smazání údajů
                </CardTitle>
                <CardDescription>
                  Máte právo požádat o smazání všech vašich osobních údajů
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myRequest ? (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-5 w-5" />
                    <p>Vaše žádost o smazání údajů čeká na vyřízení.</p>
                  </div>
                ) : (
                  <Button 
                    variant="destructive" 
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Požádat o smazání mých údajů
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete request dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Žádost o smazání údajů
            </DialogTitle>
            <DialogDescription>
              Tato akce je nevratná. Po schválení organizátorem budou smazány všechny vaše údaje včetně článků, tipů a dalších příspěvků.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Důvod žádosti (volitelné)..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Zrušit
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteRequest}
              disabled={submitting}
            >
              {submitting ? "Odesílání..." : "Odeslat žádost"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PravidlaOchranaOU;
