import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { applyNodeChanges, Background, Controls, Handle, MiniMap, Position, ReactFlow, ReactFlowProvider, type Connection, type Edge, type Node, type NodeProps, type NodeChange } from '@xyflow/react';
import { ArrowRight, ChevronDown, ChevronRight, CircleHelp, Compass, GitBranch, Layers2, Map as RoadmapIcon, Plus, Target, Trash2, X } from 'lucide-react';
import type { Roadmap, RoadmapNode, RoadmapNodeKind, RoadmapNodeStatus, Priority } from '../../../shared/types';
import { useWorkspace } from '../../state/WorkspaceContext';
import { useToast } from '../../components/Feedback';
import { Badge, Button, Field, Modal, SelectField, TextAreaField } from '../../components/ui';
import { hasRoadmapCycle } from '../../lib/calculations';
import { newId } from '../../lib/format';
import { roadmapNodeInputSchema } from '../../lib/validation';

interface LifeNodeData extends Record<string, unknown> {
  title: string; kind: RoadmapNodeKind; status: RoadmapNodeStatus; progress: number; priority: Priority; linkedLabel?: string;
}
type FlowNode = Node<LifeNodeData>;
const nodeTypes = { life: LifeNode };
const nodeKinds: RoadmapNodeKind[] = ['objective', 'goal', 'milestone', 'action', 'decision', 'learning'];

export function RoadmapPage() {
  return <ReactFlowProvider><RoadmapWorkspace /></ReactFlowProvider>;
}

function RoadmapWorkspace() {
  const { workspace, createRecord, updateRecord, deleteRecord } = useWorkspace();
  const { notify } = useToast();
  const [activeMapId, setActiveMapId] = useState(workspace.roadmaps[0]?.id ?? '');
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [newMapOpen, setNewMapOpen] = useState(false);
  const [newMapTitle, setNewMapTitle] = useState('My life map');
  const [kindToAdd, setKindToAdd] = useState<RoadmapNodeKind>('goal');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  const maps = workspace.roadmaps;
  const activeMap = maps.find((item) => item.id === activeMapId) ?? maps[0] ?? null;
  const mapNodes = workspace.roadmapNodes.filter((node) => node.roadmapId === activeMap?.id);
  const mapEdges = workspace.roadmapEdges.filter((edge) => edge.roadmapId === activeMap?.id);
  const selected = mapNodes.find((node) => node.id === selectedId) ?? null;
  const selectedTask = selected?.taskId ? workspace.tasks.find((task) => task.id === selected.taskId) : null;
  const selectedGoal = selected?.goalId ? workspace.goals.find((goal) => goal.id === selected.goalId) : null;

  useEffect(() => {
    if (!activeMapId && maps.length) setActiveMapId(maps[0].id);
  }, [maps, activeMapId]);
  useEffect(() => {
    if (!activeMap) { setNodes([]); return; }
    const visible = mapNodes.filter((node) => !hiddenByCollapse(node, mapNodes, collapsed));
    const flowNodes = visible.map((node) => {
      const linkedTask = node.taskId ? workspace.tasks.find((task) => task.id === node.taskId) : null;
      const linkedGoal = node.goalId ? workspace.goals.find((goal) => goal.id === node.goalId) : null;
      return { id: node.id, type: 'life', position: node.position, selected: node.id === selectedId, data: { title: node.title, kind: node.kind, status: linkedTask ? linkedTask.status === 'done' ? 'complete' : node.status : node.status, progress: linkedTask?.status === 'done' ? 100 : node.progress, priority: node.priority, linkedLabel: linkedTask?.title ?? linkedGoal?.title } };
    });
    setNodes(flowNodes);
    if (selectedId && !visible.some((node) => node.id === selectedId)) setSelectedId(null);
  }, [activeMap, mapNodes, mapEdges, workspace.tasks, workspace.goals, selectedId, collapsed]);

  const onNodesChange = useCallback((changes: NodeChange<FlowNode>[]) => setNodes((current) => applyNodeChanges(changes, current)), []);
  const onConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target || !activeMap) return;
    if (hasRoadmapCycle(mapEdges, connection.source, connection.target)) { notify('That dependency would create a cycle. Choose a one-way path.', 'error'); return; }
    if (mapEdges.some((edge) => edge.kind === 'dependency' && edge.source === connection.source && edge.target === connection.target)) return;
    try {
      await createRecord('roadmapEdges', { id: newId(), roadmapId: activeMap.id, source: connection.source, target: connection.target, kind: 'dependency' });
      notify('Dependency connected.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not connect those nodes.', 'error'); }
  }, [activeMap, createRecord, mapEdges, notify]);

  async function createMap(event: FormEvent) {
    event.preventDefault();
    const title = newMapTitle.trim();
    if (!title) return;
    const map: Roadmap = { id: newId(), title, description: '', createdAt: new Date().toISOString() };
    try {
      await createRecord('roadmaps', map); setActiveMapId(map.id); setSelectedId(null); setCollapsed(new Set()); setNewMapOpen(false); notify('Roadmap created. Add a first node to begin.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Could not create a roadmap.', 'error'); }
  }
  async function createNode(kind: RoadmapNodeKind, parent: RoadmapNode | null = selected) {
    if (!activeMap) return;
    const siblings = mapNodes.filter((node) => node.parentId === (parent?.id ?? null));
    const node: RoadmapNode = { id: newId(), roadmapId: activeMap.id, parentId: parent?.id ?? null, title: kind === 'objective' ? 'New objective' : kind === 'action' ? 'Next action' : `New ${kind}`, description: '', kind, status: 'planned', priority: 'medium', dueDate: '', progress: 0, notes: '', taskId: null, goalId: null, position: parent ? { x: parent.position.x + 275, y: parent.position.y + siblings.length * 145 } : { x: 100 + siblings.length * 80, y: 110 + siblings.length * 175 } };
    try { await createRecord('roadmapNodes', node); setSelectedId(node.id); notify('Node added to the roadmap.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Could not create this node.', 'error'); }
  }
  async function saveNode(node: RoadmapNode) {
    const parsed = roadmapNodeInputSchema.safeParse(node);
    if (!parsed.success) { notify(parsed.error.issues[0]?.message ?? 'Check this node.', 'error'); return; }
    if (node.parentId === node.id || isTreeCycle(mapNodes, node.id, node.parentId)) { notify('A node cannot be its own ancestor.', 'error'); return; }
    const parent = node.parentId ? mapNodes.find((item) => item.id === node.parentId) : null;
    if (parent && parent.roadmapId !== node.roadmapId) { notify('Choose a parent from this roadmap.', 'error'); return; }
    setSaveState('saving');
    try { await updateRecord('roadmapNodes', node, node.id); setSaveState('saved'); notify('Roadmap node saved.'); }
    catch (error) { setSaveState('saved'); notify(error instanceof Error ? error.message : 'Could not save this node.', 'error'); }
  }
  async function savePosition(nodeId: string, position: { x: number; y: number }) {
    const original = mapNodes.find((item) => item.id === nodeId);
    if (!original) return;
    setSaveState('saving');
    try { await updateRecord('roadmapNodes', { ...original, position }, nodeId); setSaveState('saved'); }
    catch (error) { setSaveState('saved'); notify(error instanceof Error ? error.message : 'Could not save the layout.', 'error'); }
  }
  async function removeNode() {
    if (!selected) return;
    try { await deleteRecord('roadmapNodes', selected.id); setConfirmDelete(false); setSelectedId(null); notify('Roadmap node removed.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Move its children or disconnect its edges before deleting this node.', 'error'); }
  }
  function toggleCollapse(node: RoadmapNode) {
    setCollapsed((current) => { const next = new Set(current); if (next.has(node.id)) next.delete(node.id); else next.add(node.id); return next; });
  }

  const flowEdges = useMemo<Edge[]>(() => {
    const visibleIds = new Set(nodes.map((node) => node.id));
    const treeEdges: Edge[] = mapNodes.filter((node) => node.parentId && visibleIds.has(node.id) && visibleIds.has(node.parentId)).map((node) => ({
      id: `tree:${node.id}`, source: node.parentId!, target: node.id, type: 'smoothstep',
      style: { stroke: 'var(--map-edge)', strokeWidth: 1.5 }, markerEnd: { type: 'arrowclosed' },
    }));
    const extraEdges: Edge[] = mapEdges.filter((edge) => edge.kind !== 'tree' && visibleIds.has(edge.source) && visibleIds.has(edge.target)).map((edge) => ({
      id: edge.id, source: edge.source, target: edge.target, label: edge.kind, type: 'smoothstep',
      style: { stroke: edge.kind === 'dependency' ? '#c29341' : 'var(--blue)', strokeDasharray: edge.kind === 'related' ? '5 4' : undefined },
      labelStyle: { fill: 'var(--muted)', fontSize: 10 }, markerEnd: { type: 'arrowclosed' },
    }));
    return [...treeEdges, ...extraEdges];
  }, [nodes, mapNodes, mapEdges]);

  return <div className="page roadmap-page">
    <header className="roadmap-page-heading"><div><p className="eyebrow">SEE HOW THE PIECES CONNECT</p><h1>Roadmap</h1><p className="page-description">Think in branches. Turn a big direction into connected next steps.</p></div><div className="roadmap-head-actions">{maps.length > 0 && <SelectField label="Choose roadmap" aria-label="Choose roadmap" value={activeMap?.id ?? ''} onChange={(event) => { setActiveMapId(event.target.value); setSelectedId(null); setCollapsed(new Set()); }}>{maps.map((map) => <option key={map.id} value={map.id}>{map.title}</option>)}</SelectField>}<Button variant="secondary" onClick={() => { setNewMapTitle('My life map'); setNewMapOpen(true); }}><Plus size={15} /> New map</Button></div></header>
    {!activeMap ? <div className="empty-module roadmap-empty"><div className="empty-orbit"><RoadmapIcon size={26} /></div><p className="eyebrow">A VISIBLE PATH FORWARD</p><h2>Turn a direction into branches.</h2><p>Create an interactive roadmap, then add objectives, milestones, decisions, and actions around it.</p><Button onClick={() => setNewMapOpen(true)}><Plus size={15} /> Create your first map</Button></div> : <div className="roadmap-workspace">
      <div className="roadmap-toolbar"><div className="roadmap-toolbar-left"><span className="roadmap-map-name"><span className="map-live-dot" />{activeMap.title}</span><span className="roadmap-node-count">{mapNodes.length} nodes · drag to arrange</span></div><div className="roadmap-toolbar-right"><SelectField label="Node type" aria-label="Node type" value={kindToAdd} onChange={(event) => setKindToAdd(event.target.value as RoadmapNodeKind)}>{nodeKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</SelectField><Button size="sm" onClick={() => void createNode(kindToAdd)}><Plus size={14} /> {selected ? 'Add branch' : 'Add node'}</Button><span className="save-indicator"><i className={saveState === 'saving' ? 'saving-dot' : ''} />{saveState === 'saving' ? 'Saving' : 'Saved'}</span></div></div>
      <div className={`roadmap-canvas-wrap ${selected ? 'has-selection' : ''}`}><div className="roadmap-canvas" aria-label="Interactive roadmap canvas"><ReactFlow nodes={nodes} edges={flowEdges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onConnect={(connection) => void onConnect(connection)} onNodeClick={(_event, node) => setSelectedId(node.id)} onPaneClick={() => setSelectedId(null)} onNodeDragStop={(_event, node) => void savePosition(node.id, node.position)} isValidConnection={(connection) => Boolean(connection.source && connection.target && !hasRoadmapCycle(mapEdges, connection.source, connection.target))} fitView fitViewOptions={{ padding: 0.22 }} minZoom={0.18} maxZoom={1.65} nodesDraggable nodesConnectable edgesFocusable proOptions={{ hideAttribution: true }}><Background color="var(--map-dots)" gap={24} size={1} /><Controls showInteractive={false} position="bottom-left" /><MiniMap nodeColor={(node) => colorForKind((node.data as LifeNodeData).kind)} maskColor="rgba(12,18,32,.12)" position="bottom-right" /></ReactFlow>{mapNodes.length === 0 && <div className="canvas-empty-hint"><span><GitBranch size={17} /></span><b>Your canvas is ready.</b><small>Add an objective or a first next step.</small></div>}</div>
      {selected && <aside className="node-detail-panel"><div className="node-panel-head"><div><span className="small-kicker">NODE / {selected.kind.toUpperCase()}</span><h2>Shape this step</h2></div><button className="icon-button" type="button" aria-label="Close node detail" onClick={() => setSelectedId(null)}><X size={17} /></button></div><NodeEditor key={selected.id} node={selected} allNodes={mapNodes} goals={workspace.goals} tasks={workspace.tasks} onSave={saveNode} onDelete={() => setConfirmDelete(true)} onToggleCollapse={() => toggleCollapse(selected)} collapsed={collapsed.has(selected.id)} />
        <div className="linked-context">{selectedTask ? <p><span>Linked task</span><b>{selectedTask.title}</b><Badge tone={selectedTask.status === 'done' ? 'green' : 'blue'}>{selectedTask.status === 'done' ? 'Complete' : selectedTask.status.replace('_', ' ')}</Badge></p> : selectedGoal ? <p><span>Linked goal</span><b>{selectedGoal.title}</b><Badge tone="violet">{selectedGoal.status}</Badge></p> : <p className="link-hint"><CircleHelp size={14} /> Link this node to a task or goal to connect your plans.</p>}</div>
      </aside>}
      </div>
      <div className="roadmap-footnote"><span><Compass size={14} /> Drag nodes to shape the map; layout saves when you let go.</span><span>Tree structure is saved with the node.</span></div>
    </div>}
    <Modal open={newMapOpen} title="Create a roadmap" description="Give this map a clear, useful name." onClose={() => setNewMapOpen(false)} size="sm"><form className="modal-body form-stack" onSubmit={createMap}><Field label="Roadmap name" value={newMapTitle} onChange={(event) => setNewMapTitle(event.target.value)} required maxLength={160} autoFocus /><div className="form-actions"><Button variant="secondary" onClick={() => setNewMapOpen(false)}>Cancel</Button><Button type="submit">Create map</Button></div></form></Modal>
    <Modal open={confirmDelete} title="Remove this node?" description="Its connected children and dependencies must be moved or removed first." onClose={() => setConfirmDelete(false)} size="sm"><div className="modal-body"><p className="modal-copy">Remove <strong>{selected?.title}</strong> from the roadmap?</p><div className="form-actions"><Button variant="secondary" onClick={() => setConfirmDelete(false)}>Keep node</Button><Button variant="danger" onClick={() => void removeNode()}>Remove node</Button></div></div></Modal>
  </div>;
}

function LifeNode({ data, selected }: NodeProps<FlowNode>) {
  const kind = data.kind;
  const Icon = kind === 'objective' || kind === 'goal' ? Target : kind === 'learning' ? Layers2 : kind === 'decision' ? ChevronDown : kind === 'milestone' ? RoadmapIcon : ArrowRight;
  const status = data.status;
  return <div className={`life-node node-${kind} ${selected ? 'life-node-selected' : ''}`}>
    <Handle type="target" position={Position.Left} className="node-handle" />
    <div className="life-node-top"><span className="life-node-icon"><Icon size={15} /></span><span className={`node-status-dot status-${status}`} /><span className="life-node-kind">{kind}</span></div>
    <strong>{data.title}</strong>
    <div className="life-node-bottom"><span>{status === 'complete' ? 'Complete' : status === 'blocked' ? 'Blocked' : status === 'active' ? 'In progress' : 'Planned'}</span><span>{data.progress}%</span></div>
    <div className="life-node-progress"><i style={{ width: `${data.progress}%` }} /></div>
    {data.linkedLabel && <small className="life-node-link">↗ {data.linkedLabel}</small>}
    <Handle type="source" position={Position.Right} className="node-handle" />
  </div>;
}

function NodeEditor({ node, allNodes, goals, tasks, onSave, onDelete, onToggleCollapse, collapsed }: { node: RoadmapNode; allNodes: RoadmapNode[]; goals: ReturnType<typeof useWorkspace>['workspace']['goals']; tasks: ReturnType<typeof useWorkspace>['workspace']['tasks']; onSave: (node: RoadmapNode) => Promise<void>; onDelete: () => void; onToggleCollapse: () => void; collapsed: boolean }) {
  const [draft, setDraft] = useState(node);
  const possibleParents = allNodes.filter((item) => item.id !== node.id && !isDescendantOf(allNodes, item.id, node.id));
  const descendants = allNodes.some((item) => item.parentId === node.id);
  function set<K extends keyof RoadmapNode>(key: K, value: RoadmapNode[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  return <form className="node-editor" onSubmit={(event) => { event.preventDefault(); void onSave(draft); }}>
    <Field label="Node title" value={draft.title} onChange={(event) => set('title', event.target.value)} maxLength={160} required />
    <TextAreaField label="Description" value={draft.description} onChange={(event) => set('description', event.target.value)} rows={2} placeholder="What does this branch mean?" />
    <div className="form-grid"><SelectField label="Node type" value={draft.kind} onChange={(event) => set('kind', event.target.value as RoadmapNodeKind)}>{nodeKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</SelectField><SelectField label="Status" value={draft.status} onChange={(event) => { const status = event.target.value as RoadmapNodeStatus; setDraft((current) => ({ ...current, status, progress: status === 'complete' ? 100 : current.progress })); }}><option value="planned">Planned</option><option value="active">In progress</option><option value="complete">Complete</option><option value="blocked">Blocked</option></SelectField></div>
    <div className="form-grid"><SelectField label="Priority" value={draft.priority} onChange={(event) => set('priority', event.target.value as Priority)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></SelectField><Field label="Due date" type="date" value={draft.dueDate} onChange={(event) => set('dueDate', event.target.value)} /></div>
    <label className="field"><span className="field-label">Progress · {draft.progress}%</span><input aria-label="Node progress" className="range-input" type="range" min={0} max={100} value={draft.progress} onChange={(event) => { const progress = Number(event.target.value); setDraft((current) => ({ ...current, progress, status: progress === 100 ? 'complete' : current.status === 'complete' ? 'active' : current.status })); }} /></label>
    <SelectField label="Parent node" value={draft.parentId ?? ''} onChange={(event) => set('parentId', event.target.value || null)}><option value="">Top level</option>{possibleParents.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</SelectField>
    <div className="form-grid"><SelectField label="Link to goal" value={draft.goalId ?? ''} onChange={(event) => set('goalId', event.target.value || null)}><option value="">No linked goal</option>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</SelectField><SelectField label="Link to task" value={draft.taskId ?? ''} onChange={(event) => set('taskId', event.target.value || null)}><option value="">No linked task</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</SelectField></div>
    <TextAreaField label="Notes" value={draft.notes} onChange={(event) => set('notes', event.target.value)} rows={2} placeholder="Keep this branch in context" />
    <div className="node-editor-actions"><Button type="submit">Save node</Button><Button variant="secondary" size="sm" onClick={onToggleCollapse} disabled={!descendants}>{collapsed ? <><ChevronRight size={14} /> Expand branch</> : <><ChevronDown size={14} /> Collapse branch</>}</Button><button type="button" className="node-delete-link" onClick={onDelete}><Trash2 size={14} /> Remove</button></div>
  </form>;
}

function hiddenByCollapse(node: RoadmapNode, nodes: RoadmapNode[], collapsed: Set<string>) {
  const lookup = new Map(nodes.map((item) => [item.id, item]));
  let current = node.parentId;
  const visited = new Set<string>();
  while (current && !visited.has(current)) { if (collapsed.has(current)) return true; visited.add(current); current = lookup.get(current)?.parentId ?? null; }
  return false;
}
function isDescendantOf(nodes: RoadmapNode[], candidateId: string, ancestorId: string) {
  const lookup = new Map(nodes.map((item) => [item.id, item])); let current: string | null = candidateId; const visited = new Set<string>();
  while (current && !visited.has(current)) { if (current === ancestorId) return true; visited.add(current); current = lookup.get(current)?.parentId ?? null; }
  return false;
}
function isTreeCycle(nodes: RoadmapNode[], nodeId: string, parentId: string | null) {
  return Boolean(parentId && isDescendantOf(nodes, parentId, nodeId));
}
function colorForKind(kind: RoadmapNodeKind) { return kind === 'objective' ? '#3168f5' : kind === 'goal' ? '#5383ef' : kind === 'milestone' ? '#c18d42' : kind === 'action' ? '#648b79' : kind === 'decision' ? '#927dbb' : '#cb806c'; }
