import re

file_path = "c:\\crm\\frontend\\src\\pages\\AdminPanel.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Inject state variables
state_injection = """
  const [tapCount, setTapCount] = useState(0);
  const [isSADialogOpen, setIsSADialogOpen] = useState(false);
  const [superAdmins, setSuperAdmins] = useState<AppUser[]>([]);
  const [newSAFirstName, setNewSAFirstName] = useState('');
  const [newSALastName, setNewSALastName] = useState('');
  const [newSAEmail, setNewSAEmail] = useState('');
  const [newSAPassword, setNewSAPassword] = useState('');
  const [isCreatingSA, setIsCreatingSA] = useState(false);

  useEffect(() => {
    if (tapCount >= 8) {
      setIsSADialogOpen(true);
      setTapCount(0);
      fetchSuperAdmins();
    }
    const t = setTimeout(() => setTapCount(0), 1000);
    return () => clearTimeout(t);
  }, [tapCount]);

  const fetchSuperAdmins = async () => {
    try {
      const res = await apiClient.get('/admin/super-admins');
      setSuperAdmins(res.data.data);
    } catch (e) {
      toast.error('Failed to load super admins');
    }
  };

  const handleCreateSA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSAFirstName || !newSAEmail || !newSAPassword) return;
    try {
      setIsCreatingSA(true);
      await apiClient.post('/admin/super-admins', {
        first_name: newSAFirstName,
        last_name: newSALastName,
        email: newSAEmail,
        password: newSAPassword
      });
      toast.success('Super Admin created');
      setNewSAFirstName(''); setNewSALastName(''); setNewSAEmail(''); setNewSAPassword('');
      fetchSuperAdmins();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to create Super Admin');
    } finally {
      setIsCreatingSA(false);
    }
  };

  const handleDeleteSA = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this Super Admin?')) return;
    try {
      await apiClient.delete(`/admin/super-admins/${id}`);
      toast.success('Super Admin removed');
      fetchSuperAdmins();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to remove Super Admin');
    }
  };
"""

if "setTapCount" not in content:
    content = content.replace("const [loading, setLoading] = useState(true);", "const [loading, setLoading] = useState(true);\n" + state_injection)

# 2. Add onClick to h1
h1_target = '<h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">'
h1_replacement = '<h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 cursor-pointer select-none" onClick={() => setTapCount(prev => prev + 1)}>'
if h1_replacement not in content:
    content = content.replace(h1_target, h1_replacement)

# 3. Add Dialog at the end
dialog_injection = """
      {/* Super Admin Easter Egg Dialog */}
      <Dialog open={isSADialogOpen} onOpenChange={setIsSADialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="h-5 w-5" /> 
              Super Admin Management
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Current Super Admins</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {superAdmins.map(sa => (
                      <tr key={sa.id} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium">{sa.name}</td>
                        <td className="px-4 py-2 text-gray-500">{sa.email}</td>
                        <td className="px-4 py-2 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 h-8 px-2"
                            onClick={() => handleDeleteSA(sa.id)}
                            disabled={user?.email === sa.email}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-4">Add New Super Admin</h3>
              <form onSubmit={handleCreateSA} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input value={newSAFirstName} onChange={e => setNewSAFirstName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input value={newSALastName} onChange={e => setNewSALastName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={newSAEmail} onChange={e => setNewSAEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={newSAPassword} onChange={e => setNewSAPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700" disabled={isCreatingSA}>
                  {isCreatingSA ? 'Creating...' : 'Create Super Admin'}
                </Button>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
"""
if "Super Admin Easter Egg Dialog" not in content:
    # replace the very last return / closing tags with the new dialog
    content = content.replace("    </div>\n  );\n}", dialog_injection)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Injected Easter Egg into frontend.")
