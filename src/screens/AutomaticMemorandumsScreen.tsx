import { useEffect, useState } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, RotateCcw, Save } from "lucide-react";
import type { EmailTemplate } from "../hooks/useEmailTemplates";

interface Props {
  templates: Record<string, EmailTemplate>;
  saveTemplate: (id: string, subject: string, body: string) => Promise<void>;
}

interface TemplateDef {
  id: string;
  label: string;
  trigger: string;
  placeholders: string[];
  defaultSubject: string;
  defaultBody: string;
}

// Defaults mirror the built-in fallbacks baked into the Cloud Functions (afrotc-functions repo) --
// a template here overrides that default; nothing here needs to exist for the emails to work.
const TEMPLATE_DEFS: TemplateDef[] = [
  {
    id: "absence-assigned",
    label: "Absence Memo assigned",
    trigger: "Sent the instant a cadet is marked Absent in Accountability.",
    placeholders: ["cadetName", "pmtLabel", "deadline"],
    defaultSubject: "Absence Memorandum required -- 72 hours to submit",
    defaultBody:
      "Hi {{cadetName}},<br><br>" +
      "You were marked absent for {{pmtLabel}}. You have 72 hours from the end of that session to submit an Absence Memorandum, " +
      "or the absence will stand as unexcused.<br><br>" +
      "Deadline: {{deadline}}<br><br>" +
      "Submit here: https://gorjanski11.github.io/afrotc-memo-submissions/",
  },
  {
    id: "absence-deadline-reminder",
    label: "Absence Memo -- 12 hours left",
    trigger: "Sent once, automatically, when an unsubmitted Absence Memo is within 12 hours of its 72-hour deadline.",
    placeholders: ["cadetName", "pmtLabel", "deadline"],
    defaultSubject: "Reminder: Absence Memorandum due in 12 hours",
    defaultBody:
      "Hi {{cadetName}},<br><br>" +
      "This is a reminder that your Absence Memorandum for {{pmtLabel}} is due by {{deadline}} -- less than 12 hours from now. " +
      "If it isn't submitted by then, the absence will stand as unexcused.<br><br>" +
      "Submit here: https://gorjanski11.github.io/afrotc-memo-submissions/",
  },
  {
    id: "absence-returned",
    label: "Absence Memo returned",
    trigger: "Sent when cadre returns an Absence Memo for fixes.",
    placeholders: ["cadetName", "returnReason"],
    defaultSubject: "Your Absence Memorandum was returned -- 48 hours to resubmit",
    defaultBody:
      "Hi {{cadetName}},<br><br>" +
      "Your Absence Memorandum was returned for the following reason:<br>" +
      "<em>{{returnReason}}</em><br><br>" +
      "Please fix it and resubmit within 48 hours.<br><br>" +
      "Resubmit here: https://gorjanski11.github.io/afrotc-memo-submissions/",
  },
  {
    id: "deviation-returned",
    label: "Deviation Memo returned",
    trigger: "Sent when cadre returns a Deviation Memo for fixes.",
    placeholders: ["cadetName"],
    defaultSubject: "Your Deviation Memorandum was returned -- 48 hours to resubmit",
    defaultBody:
      "Hi {{cadetName}},<br><br>" +
      "Your Deviation Memorandum was returned. Please fix it and resubmit within 48 hours.<br><br>" +
      "Resubmit here: https://gorjanski11.github.io/afrotc-memo-submissions/",
  },
];

function TemplateEditor({
  def,
  saved,
  saveTemplate,
}: {
  def: TemplateDef;
  saved: EmailTemplate | undefined;
  saveTemplate: (id: string, subject: string, body: string) => Promise<void>;
}) {
  const [subject, setSubject] = useState(saved?.subject ?? def.defaultSubject);
  const [body, setBody] = useState(saved?.body ?? def.defaultBody);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setSubject(saved?.subject ?? def.defaultSubject);
    setBody(saved?.body ?? def.defaultBody);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved?.subject, saved?.body]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveTemplate(def.id, subject, body);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSubject(def.defaultSubject);
    setBody(def.defaultBody);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{def.trigger}</p>
      <p className="text-xs text-muted-foreground">
        Available placeholders: {def.placeholders.map((p) => `{{${p}}}`).join(", ")}
      </p>
      <div className="space-y-1.5">
        <Label>Subject</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Body (basic HTML, e.g. &lt;br&gt; for line breaks)</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button size="sm" variant="outline" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to default
        </Button>
        {savedFlash && <span className="text-sm text-success">Saved.</span>}
      </div>
    </div>
  );
}

export function AutomaticMemorandumsScreen({ templates, saveTemplate }: Props) {
  return (
    <div>
      <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold">
        <Mail className="h-5 w-5 text-primary" />
        Automatic Memorandums
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Templates for the automated emails sent by the Absence/Deviation Memo lifecycle. Editing here takes effect immediately -- no redeploy needed.
      </p>

      <Card>
        <CardContent className="pt-4">
          <Accordion type="multiple" defaultValue={[TEMPLATE_DEFS[0].id]}>
            {TEMPLATE_DEFS.map((def) => (
              <AccordionItem key={def.id} value={def.id}>
                <AccordionTrigger>{def.label}</AccordionTrigger>
                <AccordionContent>
                  <TemplateEditor def={def} saved={templates[def.id]} saveTemplate={saveTemplate} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
