import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, MailOpen, Loader2, Inbox as InboxIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { LvZJContent } from '@/lib/lvzj-parser';

interface Message {
  id: string;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_username?: string;
}

export default function Inbox() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('recipient_id', user?.id)
      .order('created_at', { ascending: false });

    // Get sender usernames
    const senderIds = [...new Set((data || []).map(m => m.sender_id).filter(Boolean))];
    
    let profileMap = new Map<string, string>();
    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', senderIds);
      profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
    }

    const mappedMessages = (data || []).map(m => ({
      ...m,
      sender_username: m.sender_id ? profileMap.get(m.sender_id) || 'Systém' : 'Systém'
    }));

    setMessages(mappedMessages);
    setLoading(false);
  };

  const handleOpenMessage = async (message: Message) => {
    setSelectedMessage(message);
    
    if (!message.is_read) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', message.id);
      
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, is_read: true } : m
      ));
    }
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <InboxIcon className="w-5 h-5" />
          Příchozí pošta
          {unreadCount > 0 && (
            <Badge className="bg-primary">{unreadCount}</Badge>
          )}
        </h2>
      </div>

      {messages.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Žádné zprávy</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {messages.map((message) => (
            <Card 
              key={message.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${!message.is_read ? 'border-primary/50 bg-primary/5' : ''}`}
              onClick={() => handleOpenMessage(message)}
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  {message.is_read ? (
                    <MailOpen className="w-5 h-5 text-muted-foreground mt-0.5" />
                  ) : (
                    <Mail className="w-5 h-5 text-primary mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-medium truncate ${!message.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {message.subject}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(message.created_at), 'd. M. yyyy', { locale: cs })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      Od: {message.sender_username}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Message Detail Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedMessage?.subject}</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Od: {selectedMessage.sender_username}</span>
                <span>{format(new Date(selectedMessage.created_at), 'd. M. yyyy HH:mm', { locale: cs })}</span>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <LvZJContent content={selectedMessage.content} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
