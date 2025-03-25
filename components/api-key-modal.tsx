"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Key } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

// Add interface for component props
interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (key: string, model: string) => void;
  apiKey?: string;
  selectedModel?: string;
}

export default function ApiKeyModal({
  isOpen,
  onClose,
  onSubmit,
  apiKey = "",
  selectedModel = "gpt-4o"
}: ApiKeyModalProps) {
  const [key, setKey] = useState(apiKey);
  const [model, setModel] = useState(selectedModel);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Basic validation
    if (!key || key.trim() === "") {
      setError("Please enter a valid OpenAI API key");
      return;
    }

    // Check if it looks like an OpenAI key (starts with "sk-")
    if (!key.startsWith("sk-")) {
      setError("API key should start with 'sk-'");
      return;
    }

    // Submit the key and model
    onSubmit(key.trim(), model);

    // Clear error and close the modal
    setError("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            <span>AI Configuration</span>
          </DialogTitle>
          <DialogDescription>
            Enter your OpenAI API key and select a model to enable the AI chess
            opponent. Your key is only stored in your browser's memory and is
            never sent to our servers.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="sk-..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                You can get an API key from your{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  OpenAI account
                </a>
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="model-select">AI Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id="model-select">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o (Best quality)</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">
                    GPT-3.5 Turbo (Faster)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Different models have different capabilities and costs. GPT-4o
                provides the best chess play.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit">Save Configuration</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
