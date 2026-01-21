import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Plus, LogOut, Edit, Eye, Trash2, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Invitation {
  id: string;
  slug: string;
  groom_name: string;
  bride_name: string;
  wedding_date: string;
  is_published: boolean;
  created_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin");
        return;
      }
      setUserEmail(session.user.email || "");
      fetchInvitations();
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/admin");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from("invitations")
        .select("id, slug, groom_name, bride_name, wedding_date, is_published, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error: any) {
      toast.error("Failed to load invitations");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/admin");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invitation?")) return;

    try {
      const { error } = await supabase
        .from("invitations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Invitation deleted");
      fetchInvitations();
    } catch (error: any) {
      toast.error("Failed to delete invitation");
    }
  };

  const handleClone = async (id: string) => {
    try {
      setLoading(true);
      const { data: original, error: fetchError } = await supabase
        .from("invitations")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !original) throw fetchError;

      const newSlug = `${original.slug}-copy-${Date.now()}`;
      const { id: _id, created_at, updated_at, slug, is_published, ...cloneData } = original;

      const { data: cloned, error: insertError } = await supabase
        .from("invitations")
        .insert({
          ...cloneData,
          slug: newSlug,
          is_published: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success("Invitation cloned! Redirecting to edit...");
      navigate(`/admin/invitation/${cloned.id}`);
    } catch (error: any) {
      toast.error("Failed to clone invitation");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-blush/10 to-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground mb-2">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Welcome back, {userEmail}</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate("/admin/invitation/new")}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Invitation
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Invitations Grid */}
        {invitations.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Heart className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-display font-semibold mb-2">No invitations yet</h3>
              <p className="text-muted-foreground mb-6">Create your first wedding invitation to get started</p>
              <Button
                onClick={() => navigate("/admin/invitation/new")}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Invitation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {invitations.map((invitation) => (
              <Card key={invitation.id} className="shadow-soft hover:shadow-elegant transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl font-display">
                        {invitation.groom_name} & {invitation.bride_name}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(invitation.wedding_date), "MMM dd, yyyy")}
                      </CardDescription>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      invitation.is_published 
                        ? "bg-green-100 text-green-700" 
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {invitation.is_published ? "Published" : "Draft"}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => window.open(`/invite/${invitation.slug}`, '_blank')}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/admin/invitation/${invitation.id}`)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleClone(invitation.id)}
                      title="Clone this invitation"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(invitation.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
