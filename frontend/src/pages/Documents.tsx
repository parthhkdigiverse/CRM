// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  Image, 
  File, 
  Folder, 
  HardDrive, 
  Share2, 
  Search, 
  X, 
  Download, 
  Trash2, 
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { apiClient } from '@/lib/axios';

const foldersList = ['All', 'Finance', 'HR', 'Sales', 'Marketing', 'Legal'];

export default function Documents() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('All');
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Form states
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploadFolder, setUploadFolder] = useState('Finance');
  const [isSharedToUpload, setIsSharedToUpload] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/documents');
      setDocuments(res.data.data || []);
    } catch (err) {
      console.warn('Failed to load documents list:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileToUpload(e.target.files[0]);
    }
  };

  // Upload document submit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('folder', uploadFolder);
      formData.append('is_shared', String(isSharedToUpload));

      await apiClient.post('/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Document uploaded successfully');
      setUploadDialogOpen(false);
      setFileToUpload(null);
      setIsSharedToUpload(false);
      await fetchData();
    } catch (err) {
      toast.error('Failed to upload document');
    } finally {
      setUploadLoading(false);
    }
  };

  // Download document
  const handleDownload = async (docId: string, filename: string) => {
    try {
      const response = await apiClient.get(`/documents/${docId}/download`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (err) {
      toast.error('Failed to download file');
    }
  };

  // Delete document
  const handleDelete = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await apiClient.delete(`/documents/${docId}`);
      toast.success('Document deleted successfully');
      await fetchData();
    } catch (err) {
      toast.error('Failed to delete document');
    }
  };

  // Convert bytes to formatted string
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Calculate storage size used
  const totalBytesUsed = documents.reduce((acc, curr) => acc + (curr.size_bytes || 0), 0);
  const formattedStorageUsed = formatBytes(totalBytesUsed);

  // Calculate unique folders containing files
  const foldersCount = new Set(documents.map(d => d.folder.toLowerCase())).size;

  // Calculate shared files count
  const sharedCount = documents.filter(d => d.is_shared).length;

  // File type icon select
  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <FileText className="h-4.5 w-4.5 text-rose-500 shrink-0" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-4.5 w-4.5 text-amber-500 shrink-0" />;
      case 'xls':
      case 'xlsx':
      case 'csv':
        return <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-500 shrink-0" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <Image className="h-4.5 w-4.5 text-blue-500 shrink-0" />;
      default:
        return <File className="h-4.5 w-4.5 text-gray-500 shrink-0" />;
    }
  };

  // Filtered list
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.uploaded_by_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolder === 'All' || doc.folder.toLowerCase() === selectedFolder.toLowerCase();
    return matchesSearch && matchesFolder;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Documents</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Centralized vault for files, contracts and shared assets.</p>
        </div>
        <Button 
          onClick={() => {
            setFileToUpload(null);
            setUploadDialogOpen(true);
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4 active:scale-95 transition-all shadow-sm font-medium"
        >
          <Upload className="h-4 w-4 mr-2" /> Upload
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Files */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Files</p>
              <div className="text-3xl font-bold">{documents.length}</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        {/* Folders */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Folders</p>
              <div className="text-3xl font-bold">{foldersCount}</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Folder className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        {/* Storage Used */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Storage Used</p>
              <div className="text-3xl font-bold text-[22px] leading-8 truncate max-w-[140px]">
                {formattedStorageUsed}
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <HardDrive className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>

        {/* Shared */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Shared</p>
              <div className="text-3xl font-bold">{sharedCount}</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Share2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Layout: Folders on Left, Search/List on Right */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-4">
        {/* Left Column: Folders Menu */}
        <Card className="md:col-span-1 border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 p-5 h-fit">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Folders</h2>
          <nav className="space-y-1.5">
            {foldersList.map((folder) => {
              const isSelected = selectedFolder === folder;
              return (
                <button
                  key={folder}
                  onClick={() => setSelectedFolder(folder)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 w-full text-left rounded-xl text-xs font-bold transition-all duration-200",
                    isSelected
                      ? "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400"
                      : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-100"
                  )}
                >
                  <Folder className={cn("h-4 w-4 shrink-0", isSelected ? "text-purple-500" : "text-gray-400")} />
                  {folder}
                </button>
              );
            })}
          </nav>
        </Card>

        {/* Right Column: Search + Table Grid */}
        <Card className="md:col-span-3 border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 p-6 overflow-hidden">
          {/* Top Bar with Search & count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..." 
                className="pl-9 rounded-xl border-gray-200 dark:border-gray-800 h-9 bg-white dark:bg-gray-950" 
              />
            </div>
            <span className="text-xs font-semibold text-gray-400 shrink-0">
              {filteredDocs.length} file{filteredDocs.length !== 1 && 's'}
            </span>
          </div>

          {/* Files List Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-20 text-gray-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                Loading vault...
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                <FileText className="h-8 w-8 text-gray-300 mb-2" />
                <span className="text-xs font-semibold">No documents found</span>
                <span className="text-[10px] text-gray-400 mt-0.5">Upload files to populate this folder.</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-900 text-gray-400 uppercase tracking-wider font-bold">
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Folder</th>
                    <th className="pb-3 font-semibold">Size</th>
                    <th className="pb-3 font-semibold">Uploaded</th>
                    <th className="pb-3 font-semibold">By</th>
                    <th className="pb-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-900/50">
                  {filteredDocs.map((doc) => (
                    <tr 
                      key={doc.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors group"
                    >
                      {/* Name with icon */}
                      <td className="py-3.5 font-bold text-gray-900 dark:text-white flex items-center gap-2 max-w-[200px] truncate">
                        {getFileIcon(doc.name)}
                        <span className="truncate" title={doc.name}>{doc.name}</span>
                      </td>

                      {/* Folder badge */}
                      <td className="py-3.5 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                        {doc.folder}
                      </td>

                      {/* Size */}
                      <td className="py-3.5 font-semibold text-gray-400">
                        {formatBytes(doc.size_bytes)}
                      </td>

                      {/* Upload Date */}
                      <td className="py-3.5 font-semibold text-gray-400">
                        {doc.uploaded_at.split('T')[0]}
                      </td>

                      {/* By (User/Employee) */}
                      <td className="py-3.5 font-semibold text-gray-700 dark:text-gray-300">
                        {doc.uploaded_by_name}
                      </td>

                      {/* Download & Delete Actions */}
                      <td className="py-3.5 text-right space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDownload(doc.id, doc.name)}
                          className="p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors inline-flex items-center"
                          title="Download File"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-gray-400 hover:text-rose-500 transition-colors inline-flex items-center"
                          title="Delete File"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {/* Upload Dialog Modal */}
      {uploadDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-900">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white font-sans">Upload Document</h2>
              <button 
                onClick={() => setUploadDialogOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Destination Folder</label>
                <select
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent px-3 h-10 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:bg-gray-950"
                >
                  {foldersList.filter(f => f !== 'All').map(folder => (
                    <option key={folder} value={folder}>{folder}</option>
                  ))}
                </select>
              </div>

              {/* Upload Dropzone Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Choose File</label>
                <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-purple-500 rounded-xl p-6 text-center cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  {fileToUpload ? (
                    <div className="text-xs font-bold text-purple-600 dark:text-purple-400 truncate max-w-xs mx-auto">
                      {fileToUpload.name}
                      <span className="block text-[10px] text-gray-400 font-normal mt-0.5">
                        ({formatBytes(fileToUpload.size)})
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Click to browse or drag file here</span>
                      <span className="block text-[10px] text-gray-400 mt-1">Supports PDF, DOCX, XLSX, PNG, JPG etc.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Share Checkbox */}
              <div className="flex items-center gap-2.5 py-1">
                <input
                  type="checkbox"
                  id="is_shared_upload"
                  checked={isSharedToUpload}
                  onChange={(e) => setIsSharedToUpload(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 dark:border-gray-800 dark:bg-gray-950"
                />
                <label 
                  htmlFor="is_shared_upload" 
                  className="text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer"
                >
                  Share with team members
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-900 mt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setUploadDialogOpen(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={uploadLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl min-w-[80px]"
                >
                  {uploadLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upload'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
