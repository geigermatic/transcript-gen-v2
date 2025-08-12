export function LibraryPage() {
  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <h1 className="text-2xl font-bold text-white mb-4">Document Library</h1>
        <p className="text-gray-300">
          Manage your uploaded documents, view metadata, and organize into collections.
        </p>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Upload Documents</h2>
        <div className="border-2 border-dashed border-gray-400 rounded-lg p-8 text-center">
          <p className="text-gray-300 mb-4">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-sm text-gray-400">
            Supported formats: .docx, .txt, .md, .srt, .vtt
          </p>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Your Documents</h2>
        <p className="text-gray-400 italic">No documents uploaded yet.</p>
      </div>
    </div>
  );
}
