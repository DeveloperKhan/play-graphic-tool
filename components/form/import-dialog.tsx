"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  parseTeamsCsv,
  convertToFormData,
  IMPORT_FORMATS,
  getFormatConfig,
  type ImportFormat,
} from "@/lib/csv-import";

interface ImportDialogProps {
  onImport: (players: Array<{
    name: string;
    flags: string[];
    team: Array<{ id: string; isShadow: boolean }>;
  }>) => void;
}

export function ImportDialog({ onImport }: ImportDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [format, setFormat] = React.useState<ImportFormat>("anicor");
  const [csvText, setCsvText] = React.useState("");
  const [isImporting, setIsImporting] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [preview, setPreview] = React.useState<string | null>(null);

  const formatConfig = getFormatConfig(format);

  const handlePreview = () => {
    const parsed = parseTeamsCsv(csvText, format);
    if (parsed.errors.length > 0) {
      setErrors(parsed.errors);
      setPreview(null);
    } else {
      setErrors([]);
      setPreview(`Found ${parsed.players.length} players`);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setErrors([]);

    try {
      const parsed = parseTeamsCsv(csvText, format);
      const result = await convertToFormData(parsed);

      if (result.errors.length > 0) {
        setErrors(result.errors);
      }

      if (result.players.length > 0) {
        onImport(result.players as Array<{
          name: string;
          flags: string[];
          team: Array<{ id: string; isShadow: boolean }>;
        }>);
        setOpen(false);
        setCsvText("");
        setPreview(null);
      }
    } catch (error) {
      setErrors([(error as Error).message]);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setCsvText("");
    setErrors([]);
    setPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="text-xs">
          <Upload className="h-3 w-3 mr-1" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Teams from CSV</DialogTitle>
          <DialogDescription>
            Select a format and paste your CSV data. Shadow Pokemon should end with &quot;(Shadow)&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Format</label>
            <Select value={format} onValueChange={(v) => setFormat(v as ImportFormat)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {IMPORT_FORMATS.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formatConfig && (
              <p className="text-xs text-muted-foreground">{formatConfig.description}</p>
            )}
          </div>

          {/* CSV textarea */}
          <div className="space-y-2">
            <label className="text-sm font-medium">CSV Data</label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={formatConfig ? `${formatConfig.exampleHeader}\n${formatConfig.exampleRow}` : "Paste CSV here..."}
              className="w-full h-48 p-3 text-sm font-mono border rounded-md bg-muted/50 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {preview && (
            <div className="p-3 text-sm bg-green-500/10 text-green-700 dark:text-green-400 rounded-md">
              {preview}
            </div>
          )}

          {errors.length > 0 && (
            <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md max-h-32 overflow-y-auto">
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={!csvText.trim()}
          >
            Preview
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!csvText.trim() || isImporting}
          >
            {isImporting ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
