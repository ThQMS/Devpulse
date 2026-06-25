import { useEffect, useRef, useState, FormEvent, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { useCreateService } from '../../hooks/useServices.js';
import type { ApiError } from '../../api/client.js';
import type { CreateServiceInput } from '../../types/index.js';

interface AddServiceModalProps {
  open: boolean;
  onClose: () => void;
}

const INTERVAL_OPTIONS = [
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '1min', value: 60 },
  { label: '5min', value: 300 },
  { label: '15min', value: 900 },
  { label: '1h', value: 3600 },
];

type FieldErrors = Partial<Record<'name' | 'url', string>>;

export function AddServiceModal({ open, onClose }: AddServiceModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const createService = useCreateService();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('https://');
  const [checkIntervalSeconds, setInterval] = useState(60);
  const [groupName, setGroupName] = useState('default');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [expectedStatusCode, setExpectedStatusCode] = useState(200);
  const [timeoutMs, setTimeoutMs] = useState(5000);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Drive the native <dialog> open/close from the `open` prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  const addTag = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagDraft.trim()) {
      e.preventDefault();
      const t = tagDraft.trim();
      if (!tags.includes(t)) setTags([...tags, t]);
      setTagDraft('');
    }
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (name.trim().length === 0) next.name = 'Nome é obrigatório';
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) next.url = 'URL deve ser http(s)';
    } catch {
      next.url = 'URL inválida';
    }
    return next;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const input: CreateServiceInput = {
      name: name.trim(),
      url,
      checkIntervalSeconds,
      groupName,
      tags,
      expectedStatusCode,
      timeoutMs,
    };
    createService.mutate(input, { onSuccess: onClose });
  };

  const submitError = createService.isError
    ? ((createService.error as unknown as ApiError)?.message ?? 'Falha ao salvar')
    : null;

  return (
    <dialog ref={dialogRef} className="modal-dialog" onClose={onClose}>
      <div className="modal-header">
        <h2>Adicionar serviço</h2>
        <button className="modal-close" onClick={onClose} aria-label="Fechar" type="button">
          <X size={18} />
        </button>
      </div>

      <form className="service-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Nome *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} autoFocus />
          {errors.name && <span className="form-error">{errors.name}</span>}
        </label>

        <label className="field">
          <span>URL *</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/health"
          />
          {errors.url && <span className="form-error">{errors.url}</span>}
        </label>

        <div className="field-row">
          <label className="field">
            <span>Intervalo</span>
            <select
              value={checkIntervalSeconds}
              onChange={(e) => setInterval(Number(e.target.value))}
            >
              {INTERVAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Grupo</span>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={100}
            />
          </label>
        </div>

        <label className="field">
          <span>Tags (Enter para adicionar)</span>
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={addTag}
            placeholder="prod, api…"
          />
          {tags.length > 0 && (
            <div className="svc-tags">
              {tags.map((t) => (
                <span
                  key={t}
                  className="svc-tag"
                  onClick={() => setTags(tags.filter((x) => x !== t))}
                >
                  {t} ✕
                </span>
              ))}
            </div>
          )}
        </label>

        <div className="field-row">
          <label className="field">
            <span>Status code</span>
            <input
              type="number"
              min={100}
              max={599}
              value={expectedStatusCode}
              onChange={(e) => setExpectedStatusCode(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Timeout (ms)</span>
            <input
              type="number"
              min={500}
              max={30000}
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(Number(e.target.value))}
            />
          </label>
        </div>

        {submitError && <p className="form-error">{submitError}</p>}

        <Button type="submit" disabled={createService.isPending}>
          {createService.isPending ? 'Salvando…' : 'Salvar'}
        </Button>
      </form>
    </dialog>
  );
}
