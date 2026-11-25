'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BriefcaseBusiness, CircleCheck, Clock3, FileText, LogOut, Plus, RefreshCw, ShieldCheck, Upload, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/client-api';
import { useNavigationIdentity } from '@/components/navigation-identity';
import { validateFile } from '@/lib/validation';
import { serviceNames, statusNames, type Profile, type ProjectDetail, type WorkspaceData } from '@/lib/contracts';

type Run = (body: Record<string, unknown>, endpoint?: string) => Promise<boolean>;
const date = (value: string) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function LiveWorkspace({ requestedRole }: { requestedRole?: string }) {
  const router = useRouter();
  const { user: navigationUser } = useNavigationIdentity();
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<'projects' | 'new' | 'team' | 'profile'>('projects');
  useEffect(() => {
    const selectView = () => { if (window.location.hash === '#profile' && requestedRole === 'designer') setTab('profile'); };
    selectView();
    const openProfile = () => { if (requestedRole === 'designer') setTab('profile'); };
    window.addEventListener('hashchange', selectView);
    window.addEventListener('desaier:open-profile', openProfile);
    return () => { window.removeEventListener('hashchange', selectView); window.removeEventListener('desaier:open-profile', openProfile); };
  }, [requestedRole]);
  const load = useCallback(async (signal?: AbortSignal) => {
    const result = await api<WorkspaceData>('/api/workspace', undefined, signal);
    if (requestedRole !== result.profile.role) router.replace(`/dashboard/${result.profile.role}`);
    return result;
  }, [requestedRole, router]);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(setData).catch(error => {
      if (controller.signal.aborted) return;
      if (error.status === 401) router.replace('/login');
      else setError(error.message);
    });
    return () => controller.abort();
  }, [load, router]);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    api<ProjectDetail>(`/api/projects/${selected}`, undefined, controller.signal).then(result => {
      setDetail(result);
      setData(previous => previous ? { ...previous, projects: previous.projects.map(project => project.id === result.project.id ? result.project : project) } : previous);
    }).catch(error => {
      if (!controller.signal.aborted) setError(error.message);
    });
    return () => controller.abort();
  }, [selected, revision]);

  async function refresh() {
    setBusy(true); setError('');
    try { setData(await load()); setDetail(null); setRevision(value => value + 1); }
    catch (error) { setError(error instanceof Error ? error.message : 'Refresh failed.'); }
    finally { setBusy(false); }
  }
  const run: Run = async (body, endpoint = '/api/workspace') => {
    setBusy(true); setError(''); setMessage('');
    let saved = false;
    try {
      const result = await api<{ id?: string }>(endpoint, body); saved = true;
      if (body.action === 'create' && result.id) { setSelected(result.id); setTab('projects'); }
      setMessage('Saved to your workspace.');
      setData(await load()); setDetail(null); setRevision(value => value + 1); return true;
    } catch (error) {
      setError(`${saved ? 'Saved, but the view could not refresh. Use Refresh. ' : ''}${error instanceof Error ? error.message : 'Please try again.'}`);
      return saved;
    } finally { setBusy(false); }
  };
  if (!data || !navigationUser || data.profile.role !== navigationUser.role) return <section className="dashboard"><p className="eyebrow">DESAIER WORKSPACE</p><h1>Your creative workspace.</h1>
    {error ? <div className="panel"><p role="alert">{error}</p><div className="dash-actions"><Button className="pill" onClick={refresh} disabled={busy}>Try again</Button><Link className="pill secondary" href="/login">Log in</Link><Link className="text-link" href="/demo/client">Explore the demo</Link></div></div> : <p role="status">Opening your workspace…</p>}
  </section>;
  const { profile, projects, members } = data;
  const filtered = projects.filter(project => `${project.title} ${project.service} ${statusNames[project.status]}`.toLowerCase().includes(filter.toLowerCase()));
  return <section className="dashboard live-workspace">
    <div className="workspace-top"><p className="eyebrow">DESAIER / {profile.role.toUpperCase()} WORKSPACE</p><div className="dash-actions">
      <button className="quiet-button" onClick={refresh} disabled={busy}><RefreshCw size={16} aria-hidden="true"/>Refresh</button>
      <button className="quiet-button" disabled={busy} onClick={async () => { setBusy(true); try { await api('/api/auth/logout', {}); router.replace('/login'); router.refresh(); } catch (error) { setError((error as Error).message); setBusy(false); } }}><LogOut size={16} aria-hidden="true"/>Log out</button>
    </div></div>
    <h1>{profile.role === 'operator' ? 'Keep creativity moving.' : profile.role === 'designer' ? 'Make your next great thing.' : 'Your ideas, taking shape.'}</h1>
    <p>Welcome, {profile.name}. {profile.role === 'client' ? 'Your agency team is with you at every step.' : 'A shared view of the work and what comes next.'}</p>
    <div className="workspace-stats">
      {[[BriefcaseBusiness, 'Projects', projects.length], [Clock3, 'In progress', projects.filter(p => ['in_progress', 'changes_requested'].includes(p.status)).length], [ShieldCheck, 'In review', projects.filter(p => p.status === 'in_review').length], [CircleCheck, 'Delivered', projects.filter(p => p.status === 'delivered').length]].map(([Icon, label, value]) => {
        const StatIcon = Icon as typeof BriefcaseBusiness;
        return <div className="stat" key={String(label)}><StatIcon size={20} aria-hidden="true"/><span>{String(label)}</span><strong>{String(value)}</strong></div>;
      })}
    </div>
    <div className="workspace-tabs" aria-label="Workspace views">
      <button aria-pressed={tab === 'projects'} onClick={() => setTab('projects')}>Projects</button>
      {profile.role === 'client' && <button aria-pressed={tab === 'new'} onClick={() => setTab('new')}><Plus size={16} aria-hidden="true"/>New brief</button>}
      {profile.role === 'designer' && <button aria-pressed={tab === 'profile'} onClick={() => setTab('profile')}>Creative profile</button>}
      {profile.role === 'operator' && <button aria-pressed={tab === 'team'} onClick={() => setTab('team')}>People & access</button>}
    </div>
    <div className="workspace-notices" aria-live="polite">{message && <p className="feedback" role="status">{message}</p>}{error && <p className="feedback error" role="alert">{error}</p>}</div>
    {tab === 'profile' && <DesignerProfile key={revision} profile={profile} run={run} busy={busy}/>}
    {tab === 'new' && <NewBrief run={run} busy={busy}/>}
    {tab === 'team' && <div className="panel"><h2>People & access</h2><p>Clients register with their own email. Designate an account as a designer before assigning work. Operator access is managed by the agency owner. Roles cannot change after a member has project history.</p><div className="member-list">{members.map(member => <Member key={`${member.id}-${member.role}-${member.active}`} member={member} run={run} busy={busy}/>)}</div>{members.length === 500 && <p>Showing the first 500 members.</p>}</div>}
    {tab === 'projects' && <div className="project-layout"><aside className="project-sidebar panel"><label>Find a project<input type="search" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Name, service or stage"/></label>
      <p className="note">{projects.length === 200 ? 'Latest 200 projects' : `${projects.length} projects`} · newest activity first</p>
      <div className="project-list">{filtered.map(project => <button key={project.id} className="project-card" aria-pressed={selected === project.id} onClick={() => { setDetail(null); if (selected === project.id) setRevision(value => value + 1); setSelected(project.id); setError(''); setMessage(''); }}><span className={`status status-${project.status}`}>{statusNames[project.status]}</span><strong>{project.title}</strong><span>{project.service}</span><small>{project.due_date ? `Due ${date(project.due_date)}` : 'Schedule to be confirmed'}</small></button>)}</div>
      {!filtered.length && <p>{filter ? 'No projects match your search.' : profile.role === 'client' ? 'Your next chapter starts with a brief.' : 'Projects will appear here when work is available.'}</p>}
    </aside><div className="project-content">{!selected ? <div className="empty-project panel"><FileText size={36} aria-hidden="true"/><h2>Space for your next chapter.</h2><p>{profile.role === 'client' ? 'Start a brief or choose a project to see its progress, conversations and approved files.' : 'Choose a project to see the brief, tasks and delivery review.'}</p>{profile.role === 'client' && <Button className="pill" onClick={() => setTab('new')}>Start a project</Button>}</div> : detail?.project.id === selected ? <ProjectView key={`${detail.project.id}-${detail.project.version}-${revision}`} detail={detail} profile={profile} members={members} aiEnabled={data.aiEnabled} run={run} busy={busy} refresh={refresh} setError={setError} setBusy={setBusy} setMessage={setMessage}/> : <p role="status">Loading project…</p>}</div></div>}
  </section>;
}

function NewBrief({ run, busy }: { run: Run; busy: boolean }) {
  return <form className="panel brief-form" onSubmit={async event => {
    event.preventDefault(); const form = event.currentTarget;
    if (await run({ action: 'create', ...Object.fromEntries(new FormData(form)) })) form.reset();
  }}><p className="eyebrow">A NEW POSSIBILITY</p><h2>Tell us what’s next.</h2><p>Your operator will review your brief and assemble the right creative team.</p><fieldset disabled={busy}>
    <label>Project name<input name="title" required minLength={3} maxLength={120} placeholder="Your next chapter"/></label>
    <label>Service<select name="service">{serviceNames.map(service => <option key={service}>{service}</option>)}</select></label>
    <div className="brief-fields"><label>Industry<input name="industry" maxLength={500} placeholder="Your business sector"/></label><label>Audience<input name="audience" maxLength={500} placeholder="Who should this reach?"/></label><label>Desired style<input name="style" maxLength={500} placeholder="Visual direction or references"/></label><label>Budget guidance<input name="budget" maxLength={500} placeholder="Optional range and currency"/></label><label>Preferred deadline<input name="deadline" type="date"/></label><label>Communication language<input name="language" maxLength={500} placeholder="Preferred language"/></label></div>
    <label>Your brief<textarea name="brief" required minLength={20} maxLength={10000} rows={7} placeholder="Describe your goals, audience, deliverables and any timing you have in mind."/></label>
    <Button className="pill" type="submit">{busy ? 'Submitting…' : 'Send brief to the agency'}</Button>
  </fieldset></form>;
}

function DesignerProfile({ profile, run, busy }: { profile: Profile; run: Run; busy: boolean }) {
  return <form className="panel brief-form" onSubmit={event => { event.preventDefault(); const fields = new FormData(event.currentTarget); void run({ ...Object.fromEntries(fields), action: 'profile', available: fields.get('available') === 'on' }); }}>
    <h2>Your creative perspective.</h2><p>Help Desaier understand your strengths and availability. Your profile is visible to agency operators and may inform AI matching suggestions.</p><fieldset disabled={busy}>
      <label>Skills & tools<input name="skills" maxLength={500} defaultValue={profile.skills} placeholder="Brand identity, typography, Figma…"/></label>
      <label>Creative approach<textarea name="bio" maxLength={2000} defaultValue={profile.bio} placeholder="Describe your approach and relevant work. Include personal details only if needed."/></label>
      <label>Languages<input name="languages" maxLength={200} defaultValue={profile.languages}/></label>
      <label>Timezone<input name="timezone" maxLength={80} defaultValue={profile.timezone} placeholder="Europe/Chisinau"/></label>
      <label>Portfolio URL<input name="portfolio_url" type="url" maxLength={500} defaultValue={profile.portfolio_url} placeholder="https://…"/></label>
      <label className="check-label"><input name="available" type="checkbox" defaultChecked={profile.available}/>Available for new projects</label>
      <Button type="submit" className="pill">Save creative profile</Button>
    </fieldset>
  </form>;
}

function Member({ member, run, busy }: { member: Profile; run: Run; busy: boolean }) {
  return <form className="member-row" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void run({ action: 'member', member_id: member.id, role: form.get('role'), active: form.get('active') === 'on' }); }}>
    <div><strong>{member.name}</strong><small>{member.id}</small>{member.role === 'designer' && <><p>{member.skills || 'Skills not yet added'}<br/>{member.languages} {member.timezone}<br/>{member.available ? 'Available for projects' : 'Currently unavailable'}</p>{member.portfolio_url && /^https:\/\//.test(member.portfolio_url) && <a className="text-link" href={member.portfolio_url} target="_blank" rel="noopener noreferrer">View portfolio</a>}</>}</div>
    {member.role === 'operator' ? <span className="status">Agency operator</span> : <fieldset disabled={busy}>
      <label>Role for {member.name}<select name="role" defaultValue={member.role}><option value="client">Client</option><option value="designer">Designer</option></select></label>
      <label className="check-label"><input type="checkbox" name="active" defaultChecked={member.active}/>Active account</label><Button className="pill secondary" type="submit">Save access</Button>
    </fieldset>}
  </form>;
}

function ProjectView({ detail, profile, members, run, busy, aiEnabled, refresh, setError, setBusy, setMessage }: {
  detail: ProjectDetail; profile: Profile; members: Profile[]; run: Run; busy: boolean; aiEnabled: boolean;
  refresh: () => Promise<void>; setError: (text: string) => void; setBusy: (value: boolean) => void; setMessage: (text: string) => void;
}) {
  const { project, comments, tasks, deliveries, events, ai } = detail;
  const staff = profile.role !== 'client', operator = profile.role === 'operator';
  const closed = ['delivered', 'archived'].includes(project.status);
  const common = { project_id: project.id, version: project.version };
  const [uploadStage, setUploadStage] = useState('');
  return <>
    <article className="panel project-brief"><p className="eyebrow">PROJECT / {project.id.slice(0, 8).toUpperCase()}</p><span className={`status status-${project.status}`}>{statusNames[project.status]}</span><h2>{project.title}</h2><p>{project.service} · {project.due_date ? `Due ${date(project.due_date)}` : 'Schedule to be confirmed'}</p><p className="preserve-lines">{project.brief}</p><dl className="brief-details">{Object.entries(project.requirements ?? {}).filter(([, value]) => value).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      {operator && !closed && <form className="assignment-form" onSubmit={event => { event.preventDefault(); const fields = Object.fromEntries(new FormData(event.currentTarget)); void run({ ...common, ...fields, action: project.status === 'in_review' ? 'schedule' : 'assign' }); }}><fieldset disabled={busy}>
        {project.status !== 'in_review' && <label>Assigned designer<select name="designer_id" defaultValue={project.designer_id || ''} required><option value="" disabled>Choose a designer</option>{members.filter(member => member.role === 'designer' && member.active).map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>}
        <label>Target delivery date<input type="date" name="due_date" defaultValue={project.due_date || ''}/></label><Button type="submit" className="pill secondary">{project.status === 'in_review' ? 'Save schedule' : 'Save assignment'}</Button>
      </fieldset></form>}
      {operator && ['submitted', 'delivered'].includes(project.status) && <Button className="pill secondary" disabled={busy} onClick={() => void run({ ...common, action: 'archive' })}>Archive project</Button>}
    </article>
    <article className="panel"><h2>Milestones & tasks</h2><p>Agreed steps toward the final delivery.</p><ul className="task-list">{tasks.map(task => <li key={task.id}><label className="check-label"><input type="checkbox" checked={task.done} disabled={!staff || busy || closed} onChange={event => void run({ ...common, action: 'task', task_id: task.id, done: event.target.checked })}/>{task.title}</label></li>)}</ul>{!tasks.length && <p>The operator will add the project milestones here.</p>}
      {operator && !closed && <form onSubmit={async event => { event.preventDefault(); const form = event.currentTarget; if (await run({ ...common, action: 'task', title: new FormData(form).get('title'), done: false })) form.reset(); }}><fieldset disabled={busy}><label>New task<input name="title" required minLength={3} maxLength={200} placeholder="Define the visual direction"/></label><Button className="pill secondary" type="submit">Add task</Button></fieldset></form>}
    </article>
    <article className="panel"><h2>{staff ? 'Delivery & review' : 'Your approved files'}</h2><p>{staff ? 'Every submission goes through operator review before the client receives it.' : 'Your files appear here once the agency has reviewed and approved them.'}</p>
      <ul className="delivery-list">{deliveries.map((delivery, index) => <li key={delivery.id}><FileText size={20} aria-hidden="true"/><div><strong>{delivery.filename}</strong><small>{date(delivery.created_at)} · {delivery.approved ? 'Approved' : 'Internal review'}</small></div><div className="dash-actions">
        <button className="quiet-button" disabled={busy} onClick={async () => { try { const result = await api<{ url: string }>('/api/files', { action: 'download', delivery_id: delivery.id }); window.location.assign(result.url); } catch (error) { setError((error as Error).message); } }}>Download</button>
        {operator && project.status === 'in_review' && index === 0 && !delivery.approved && <Button className="pill" disabled={busy} onClick={() => void run({ ...common, action: 'approve', delivery_id: delivery.id })}>Approve delivery</Button>}
      </div></li>)}</ul>
      {!deliveries.length && <p>No {staff ? 'submitted' : 'approved'} files yet.</p>}
      {staff && ['in_progress', 'changes_requested'].includes(project.status) && <form onSubmit={async event => {
        event.preventDefault(); const form = event.currentTarget, fields = new FormData(form), file = fields.get('file') as File;
        setBusy(true); setError(''); setMessage(''); let path: string | undefined; let submitted = false;
        try {
          validateFile(file.name, file.type, file.size); setUploadStage('Preparing upload…');
          const upload = await api<{ path: string; token: string }>('/api/files', { ...common, action: 'upload', filename: file.name, size: file.size, type: file.type }); path = upload.path;
          setUploadStage('Uploading file…');
          const { createClient } = await import('@supabase/supabase-js');
          const storage = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
          const result = await storage.storage.from('deliverables').uploadToSignedUrl(path, upload.token, file, { contentType: file.type });
          if (result.error) throw new Error('The file could not be uploaded. Check its type and size, then try again.');
          setUploadStage('Submitting for review…');
          await api('/api/files', { ...common, action: 'submit', path, filename: file.name, note: fields.get('note') }); submitted = true;
          setMessage('File submitted for operator review.'); form.reset(); await refresh();
        } catch (error) {
          if (path && !submitted) { try { await api('/api/files', { ...common, action: 'cleanup', path }); } catch { /* RLS preserves any file already registered after an ambiguous network response. */ } }
          setError((error as Error).message);
        } finally { setBusy(false); setUploadStage(''); }
      }}><fieldset disabled={busy}><label>Deliverable file<input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.zip" required/></label><p>PDF, PNG, JPG, WebP or ZIP · up to 20 MB</p><label>Note for the operator<textarea name="note" maxLength={4000}/></label><Button className="pill" type="submit"><Upload size={16} aria-hidden="true"/>{uploadStage || 'Submit file for review'}</Button></fieldset></form>}
      {operator && project.status === 'in_review' && <form onSubmit={event => { event.preventDefault(); void run({ ...common, action: 'request_changes', feedback: new FormData(event.currentTarget).get('feedback') }); }}><fieldset disabled={busy}><label>Review feedback<textarea name="feedback" required minLength={3} maxLength={4000} placeholder="Describe what needs refinement. This note is internal."/></label><Button className="pill secondary" type="submit">Request changes</Button></fieldset></form>}
    </article>
    <article className="panel"><h2>Project conversation</h2>{project.status !== 'archived' && <form onSubmit={async event => { event.preventDefault(); const form = event.currentTarget, fields = new FormData(form); if (await run({ ...common, action: 'comment', body: fields.get('body'), internal: fields.get('internal') === 'on' })) form.reset(); }}><fieldset disabled={busy}><label>Message<textarea name="body" required maxLength={4000} placeholder="Share an update or ask a question."/></label>{staff && <label className="check-label"><input type="checkbox" name="internal" defaultChecked/>Internal note · agency team only</label>}<Button className="pill secondary" type="submit">Post message</Button></fieldset></form>}
      <ul className="conversation">{comments.map(comment => <li key={comment.id}><small>{comment.author_id === profile.id ? 'You' : 'Project participant'} · {date(comment.created_at)} · {comment.internal ? 'Internal' : 'Shared with client'}</small><p className="preserve-lines">{comment.body}</p></li>)}</ul>{comments.length === 200 && <p>Showing the latest 200 messages.</p>}
    </article>
    {operator && <article className="panel ai-panel"><WandSparkles size={24} aria-hidden="true"/><h2>A second perspective.</h2><p>Generate a brief summary, suggested deliverables and review checklist. Your project brief and available designers’ skills, bio, languages and timezones will be sent to OpenAI for matching suggestions. Suggestions stay internal and require your review.</p><Button className="pill" disabled={busy || !aiEnabled} onClick={() => void run({ project_id: project.id }, '/api/ai')}>{busy ? 'Please wait…' : 'Analyze brief with AI'}</Button>{!aiEnabled && <p>AI assistance is not available yet.</p>}{ai.map(item => <div className="ai-result" key={item.id}><small>{date(item.created_at)} · AI draft · {item.status}</small>{item.result && <p className="preserve-lines">{members.reduce((text, member) => text.replaceAll(member.id, member.name), item.result)}</p>}{item.status === 'failed' && <p>The provider could not complete this draft. Your project was not changed.</p>}</div>)}</article>}
    <article className="panel"><h2>Project activity</h2><ol className="activity-list">{events.map(event => <li key={event.id}><span>{event.action}</span><time dateTime={event.created_at}>{date(event.created_at)}</time></li>)}</ol></article>
  </>;
}
