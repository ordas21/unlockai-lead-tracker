"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ── Types ──

type User = { id: string; email: string; name: string };
type Project = { id: string; slug: string; name: string; created_at: string; lead_count: number; active_keys: number };
type ApiKey = { id: string; key_prefix: string; label: string; created_at: string; revoked_at: string | null };
type Stats = { total: number; today: number; thisWeek: number; thisMonth: number; bySource: { source: string; count: number }[]; byType: { type: string; count: number }[]; daily: { date: string; count: number }[] };
type Lead = { id: string; source: string; name: string | null; email: string | null; phone: string | null; type: string | null; metadata: string | null; created_at: string };
type NotificationConfig = { configured: boolean; enabled?: boolean; to_email?: string; from_name?: string; mailgun_domain?: string; mailgun_base_url?: string; mailgun_api_key_masked?: string };

// ── Helpers ──

const SOURCE_LABELS: Record<string, string> = { quote_form: "Quote Form", chatbot: "Chatbot", phone_click: "Phone Click", contact_form: "Contact Form" };
const SOURCE_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = { quote_form: "default", chatbot: "secondary", phone_click: "outline", contact_form: "secondary" };

const METADATA_LABELS: Record<string, string> = {
  address: "Address", roofAge: "Roof Age", yearBuilt: "Year Built",
  squareFt: "Square Footage", drivers: "Drivers", vins: "Vehicles / VINs",
  currentCoverage: "Current Coverage", riderExperience: "Rider Experience",
  rvType: "RV Type", fullTimeUse: "Full-Time Use", boatType: "Boat Type",
  boatLength: "Boat Length", boatValue: "Boat Value", waterType: "Water Type",
  existingPolicies: "Existing Policies", desiredCoverage: "Desired Coverage",
  businessType: "Business Type", employees: "Employees",
  annualRevenue: "Annual Revenue", personalPropertyValue: "Personal Property Value",
  floodZone: "Flood Zone", message: "Message",
};

function parseMetadata(raw: string | null): Record<string, string> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || !parsed) return null;
    const entries = Object.entries(parsed).filter(([, v]) => v != null && v !== "");
    return entries.length > 0 ? Object.fromEntries(entries) as Record<string, string> : null;
  } catch { return null; }
}

function SourceBadge({ source }: { source: string }) {
  return <Badge variant={SOURCE_VARIANTS[source] || "outline"}>{SOURCE_LABELS[source] || source}</Badge>;
}

function LeadDetail({ lead }: { lead: Lead }) {
  const meta = parseMetadata(lead.metadata);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Contact</p>
          <p className="mt-1 text-sm font-medium">{lead.name || "—"}</p>
          {lead.email && <a href={`mailto:${lead.email}`} className="text-sm text-blue-600 hover:underline">{lead.email}</a>}
          {lead.phone && <a href={`tel:${lead.phone.replace(/\D/g, "")}`} className="block text-sm text-blue-600 hover:underline">{lead.phone}</a>}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <SourceBadge source={lead.source} />
          {lead.type && <Badge variant="outline">{lead.type}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(lead.created_at).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}
        </p>
      </div>
      {meta && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Details</p>
          {Object.entries(meta).map(([key, value]) => (
            <div key={key} className="flex gap-2 text-sm">
              <span className="shrink-0 font-medium text-muted-foreground">{METADATA_LABELS[key] || key}:</span>
              <span className="whitespace-pre-wrap">{String(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Components ──

function NewProjectForm({ onCreated }: { onCreated: () => void }) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, name }) });
    setSlug(""); setName(""); setOpen(false); onCreated();
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} className="w-full rounded-md border-2 border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
      + New Project
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-md border bg-card p-3">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" required />
      <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="project-slug" className="font-mono text-xs" required />
      <div className="flex gap-2">
        <Button type="submit" size="sm">Create</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}

function ApiKeysPanel({ projectId }: { projectId: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [label, setLabel] = useState("production");
  const [showForm, setShowForm] = useState(false);

  const fetchKeys = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/keys`);
    if (res.ok) { const d = await res.json(); setKeys(d.keys); }
  }, [projectId]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const generateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/projects/${projectId}/keys`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }) });
    if (res.ok) { const d = await res.json(); setNewKey(d.key); setShowForm(false); setLabel("production"); fetchKeys(); }
  };

  const revokeKey = async (keyId: string) => {
    await fetch(`/api/projects/${projectId}/keys/${keyId}`, { method: "PATCH" });
    fetchKeys();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">API Keys</CardTitle>
        {!showForm && <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>Generate</Button>}
      </CardHeader>
      <CardContent>
        {newKey && (
          <div className="mb-4 rounded-lg border border-chart-4/30 bg-chart-4/10 p-3">
            <p className="text-xs font-medium">Copy this key now — you won&apos;t see it again.</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 break-all rounded border bg-card px-2 py-1.5 text-xs font-mono">{newKey}</code>
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(newKey)}>Copy</Button>
            </div>
            <button onClick={() => setNewKey(null)} className="mt-2 text-xs text-muted-foreground underline">Dismiss</button>
          </div>
        )}

        {showForm && (
          <form onSubmit={generateKey} className="mb-4 flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Label</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="production, staging..." />
            </div>
            <Button type="submit" size="sm">Generate</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </form>
        )}

        <div className="divide-y">
          {keys.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No API keys yet</p>}
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between py-3">
              <div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-muted-foreground">{k.key_prefix}</code>
                  <Badge variant="secondary" className="text-[10px]">{k.label}</Badge>
                  {k.revoked_at && <Badge variant="destructive" className="text-[10px]">revoked</Badge>}
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Created {new Date(k.created_at).toLocaleDateString()}</p>
              </div>
              {!k.revoked_at && (
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive text-xs" onClick={() => revokeKey(k.id)}>Revoke</Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationsPanel({ projectId }: { projectId: string }) {
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ enabled: true, to_email: "", from_name: "Lead Tracker", mailgun_api_key: "", mailgun_domain: "", mailgun_base_url: "https://api.mailgun.net" });

  const fetchConfig = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/notifications`);
    if (res.ok) {
      const d = await res.json(); setConfig(d);
      if (d.configured) setForm({ enabled: d.enabled, to_email: d.to_email || "", from_name: d.from_name || "Lead Tracker", mailgun_api_key: "", mailgun_domain: d.mailgun_domain || "", mailgun_base_url: d.mailgun_base_url || "https://api.mailgun.net" });
    }
  }, [projectId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const payload: Record<string, unknown> = { ...form };
    if (config?.configured && !form.mailgun_api_key) delete payload.mailgun_api_key;
    await fetch(`/api/projects/${projectId}/notifications`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false); setEditing(false); fetchConfig();
  };

  const handleDelete = async () => {
    await fetch(`/api/projects/${projectId}/notifications`, { method: "DELETE" });
    setConfig({ configured: false }); setEditing(false);
  };

  if (!config) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">Email Notifications</CardTitle>
        {config.configured && !editing && (
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${config.enabled ? "bg-chart-4" : "bg-muted"}`} />
            <span className="text-xs text-muted-foreground">{config.enabled ? "Active" : "Off"}</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!config.configured && !editing ? (
          <div>
            <p className="text-sm text-muted-foreground">No notifications configured.</p>
            <Button size="sm" className="mt-3" onClick={() => setEditing(true)}>Configure</Button>
          </div>
        ) : !editing ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">To</span><span className="font-medium">{config.to_email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">From</span><span>{config.from_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Domain</span><code className="text-xs">{config.mailgun_domain}</code></div>
            <div className="flex justify-between"><span className="text-muted-foreground">API Key</span><code className="text-xs">{config.mailgun_api_key_masked}</code></div>
            <Separator />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDelete}>Remove</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="rounded" />
              Enabled
            </label>
            <div className="space-y-1"><Label className="text-xs">Send To</Label><Input value={form.to_email} onChange={(e) => setForm({ ...form, to_email: e.target.value })} placeholder="leads@example.com" required /></div>
            <div className="space-y-1"><Label className="text-xs">From Name</Label><Input value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Mailgun API Key</Label><Input value={form.mailgun_api_key} onChange={(e) => setForm({ ...form, mailgun_api_key: e.target.value })} className="font-mono text-xs" placeholder={config?.configured ? "Leave blank to keep current" : "key-xxxxx"} required={!config?.configured} /></div>
            <div className="space-y-1"><Label className="text-xs">Mailgun Domain</Label><Input value={form.mailgun_domain} onChange={(e) => setForm({ ...form, mailgun_domain: e.target.value })} className="font-mono text-xs" required /></div>
            <div className="space-y-1"><Label className="text-xs">Base URL</Label><Input value={form.mailgun_base_url} onChange={(e) => setForm({ ...form, mailgun_base_url: e.target.value })} className="font-mono text-xs" /></div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Dashboard ──

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;
  const [activeTab, setActiveTab] = useState<"overview" | "leads" | "settings">("overview");
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (!r.ok) { router.push("/login"); return null; }
      return r.json();
    }).then((data) => { if (data?.authenticated) { setUser(data.user); setLoading(false); } }).catch(() => router.push("/login"));
  }, [router]);

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects");
    if (res.ok) { const d = await res.json(); setProjects(d.projects); if (!selectedId && d.projects.length > 0) setSelectedId(d.projects[0].id); }
  }, [selectedId]);

  useEffect(() => { if (user) fetchProjects(); }, [user, fetchProjects]);

  useEffect(() => {
    if (!user || !selectedId) return;
    fetch(`/api/leads/stats?projectId=${selectedId}`).then((r) => r.ok ? r.json() : null).then((s) => setStats(s));
  }, [user, selectedId]);

  const fetchLeads = useCallback(async () => {
    if (!user || !selectedId) return;
    const params = new URLSearchParams({ projectId: selectedId, limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
    if (sourceFilter) params.set("source", sourceFilter);
    const res = await fetch(`/api/leads?${params}`);
    if (res.ok) { const d = await res.json(); setLeads(d.leads ?? []); setTotalLeads(d.total ?? 0); }
  }, [user, selectedId, sourceFilter, page]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { setSourceFilter(""); setTypeFilter(""); setPage(0); setActiveTab("overview"); }, [selectedId]);

  const exportCSV = () => {
    if (!leads.length) return;
    const h = ["Name", "Email", "Phone", "Type", "Source", "Date"];
    const rows = leads.map((l) => [l.name || "", l.email || "", l.phone || "", l.type || "", l.source, new Date(l.created_at).toLocaleString()]);
    const csv = [h, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); };
  const filteredLeads = typeFilter ? leads.filter((l) => l.type === typeFilter) : leads;

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );

  const selectedProject = projects.find((p) => p.id === selectedId);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r bg-card p-4 flex flex-col">
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">U</div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">UnlockAI</p>
            <p className="text-[11px] text-muted-foreground">Lead Tracker</p>
          </div>
        </div>

        <Separator className="my-4" />

        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Projects</p>
        <div className="space-y-1">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                p.id === selectedId ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
              }`}
            >
              <span className="block truncate font-medium">{p.name}</span>
              <span className={`text-[10px] ${p.id === selectedId ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {p.lead_count} leads &middot; {p.active_keys} keys
              </span>
            </button>
          ))}
        </div>
        <div className="mt-2">
          <NewProjectForm onCreated={fetchProjects} />
        </div>

        <div className="mt-auto pt-4 border-t">
          {user && (
            <div className="px-1 mb-2">
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
            </div>
          )}
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-6 lg:p-8">
        {!selectedProject ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">Create a project to get started</div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{selectedProject.name}</h1>
              <code className="text-xs text-muted-foreground">{selectedProject.slug}</code>
            </div>

            {/* Tabs */}
            <div className="mt-6 flex gap-1 border-b">
              {(["overview", "leads", "settings"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Overview */}
            {activeTab === "overview" && (
              <>
                <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    { label: "Total Leads", value: stats?.total ?? 0 },
                    { label: "Today", value: stats?.today ?? 0 },
                    { label: "This Week", value: stats?.thisWeek ?? 0 },
                    { label: "This Month", value: stats?.thisMonth ?? 0 },
                  ].map(({ label, value }) => (
                    <Card key={label}>
                      <CardContent className="pt-5">
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">By Source</CardTitle></CardHeader>
                    <CardContent>
                      {stats?.bySource?.length ? (
                        <div className="space-y-3">
                          {stats.bySource.map(({ source, count }) => (
                            <div key={source}>
                              <div className="flex items-center justify-between mb-1">
                                <SourceBadge source={source} />
                                <span className="text-sm font-semibold">{count}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted">
                                <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${Math.round((count / (stats.total || 1)) * 100)}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-muted-foreground">No data yet</p>}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">By Type</CardTitle></CardHeader>
                    <CardContent>
                      {stats?.byType?.length ? (
                        <div className="space-y-3">
                          {stats.byType.map(({ type, count }) => (
                            <div key={type}>
                              <div className="flex items-center justify-between mb-1">
                                <Badge variant="outline">{type}</Badge>
                                <span className="text-sm font-semibold">{count}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted">
                                <div className="h-1.5 rounded-full bg-chart-2 transition-all" style={{ width: `${Math.round((count / (stats.total || 1)) * 100)}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-muted-foreground">No data yet</p>}
                    </CardContent>
                  </Card>
                </div>

                <Card className="mt-6">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium">Recent Leads</CardTitle>
                    <Button variant="link" size="sm" className="text-xs" onClick={() => setActiveTab("leads")}>View All</Button>
                  </CardHeader>
                  <CardContent className="px-0 pb-0">
                    {leads.length ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="border-y bg-muted/50 text-xs text-muted-foreground">
                            <tr><th className="px-5 py-2.5 font-medium">Name</th><th className="px-5 py-2.5 font-medium">Contact</th><th className="px-5 py-2.5 font-medium">Type</th><th className="px-5 py-2.5 font-medium">Source</th><th className="px-5 py-2.5 font-medium">Date</th></tr>
                          </thead>
                          <tbody className="divide-y">
                            {leads.slice(0, 10).map((lead) => (
                              <Fragment key={lead.id}>
                                <tr onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)} className="hover:bg-muted/30 transition-colors cursor-pointer">
                                  <td className="px-5 py-2.5 font-medium">{lead.name ?? "—"}</td>
                                  <td className="px-5 py-2.5"><div className="text-foreground">{lead.email ?? "—"}</div>{lead.phone && <div className="text-xs text-muted-foreground">{lead.phone}</div>}</td>
                                  <td className="px-5 py-2.5">{lead.type ? <Badge variant="outline">{lead.type}</Badge> : "—"}</td>
                                  <td className="px-5 py-2.5"><SourceBadge source={lead.source} /></td>
                                  <td className="px-5 py-2.5 text-muted-foreground whitespace-nowrap">{new Date(lead.created_at).toLocaleDateString()}</td>
                                </tr>
                                {expandedLead === lead.id && (
                                  <tr><td colSpan={5} className="bg-muted/20 px-5 py-4"><LeadDetail lead={lead} /></td></tr>
                                )}
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <div className="px-5 py-10 text-center text-muted-foreground">No leads recorded yet.</div>}
                  </CardContent>
                </Card>
              </>
            )}

            {/* Leads */}
            {activeTab === "leads" && (
              <>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(0); }} className="rounded-md border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30">
                    <option value="">All Sources</option>
                    <option value="quote_form">Quote Form</option><option value="chatbot">Chatbot</option><option value="phone_click">Phone Click</option><option value="contact_form">Contact Form</option>
                  </select>
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-md border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30">
                    <option value="">All Types</option>
                    {(stats?.byType || []).map(({ type }) => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <div className="flex-1" />
                  <span className="text-xs text-muted-foreground">{totalLeads} lead{totalLeads !== 1 ? "s" : ""}</span>
                  <Button variant="outline" size="sm" onClick={exportCSV}>Export CSV</Button>
                </div>

                <Card className="mt-4">
                  <CardContent className="px-0 pb-0 pt-0">
                    {filteredLeads.length ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                            <tr><th className="px-5 py-2.5 font-medium">Name</th><th className="px-5 py-2.5 font-medium">Email</th><th className="px-5 py-2.5 font-medium">Phone</th><th className="px-5 py-2.5 font-medium">Type</th><th className="px-5 py-2.5 font-medium">Source</th><th className="px-5 py-2.5 font-medium">Date</th></tr>
                          </thead>
                          <tbody className="divide-y">
                            {filteredLeads.map((lead) => (
                              <Fragment key={lead.id}>
                                <tr onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)} className="hover:bg-muted/30 transition-colors cursor-pointer">
                                  <td className="px-5 py-2.5 font-medium">{lead.name ?? "—"}</td>
                                  <td className="px-5 py-2.5 text-muted-foreground">{lead.email ?? "—"}</td>
                                  <td className="px-5 py-2.5 text-muted-foreground">{lead.phone ?? "—"}</td>
                                  <td className="px-5 py-2.5">{lead.type ? <Badge variant="outline">{lead.type}</Badge> : "—"}</td>
                                  <td className="px-5 py-2.5"><SourceBadge source={lead.source} /></td>
                                  <td className="px-5 py-2.5 text-muted-foreground whitespace-nowrap">{new Date(lead.created_at).toLocaleString()}</td>
                                </tr>
                                {expandedLead === lead.id && (
                                  <tr><td colSpan={6} className="bg-muted/20 px-5 py-4"><LeadDetail lead={lead} /></td></tr>
                                )}
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <div className="px-5 py-10 text-center text-muted-foreground">No leads match filters.</div>}
                  </CardContent>
                </Card>

                {totalLeads > PAGE_SIZE && (
                  <div className="mt-4 flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
                    <span className="text-xs text-muted-foreground">Page {page + 1} of {Math.ceil(totalLeads / PAGE_SIZE)}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PAGE_SIZE >= totalLeads}>Next</Button>
                  </div>
                )}
              </>
            )}

            {/* Settings */}
            {activeTab === "settings" && (
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <ApiKeysPanel projectId={selectedProject.id} />
                <NotificationsPanel projectId={selectedProject.id} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
