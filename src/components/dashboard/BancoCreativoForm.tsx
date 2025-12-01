'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DialogFooter } from '@/components/ui/dialog';
import type { BancoCreativo } from './CreativesBoard';

interface BancoCreativoFormProps {
    onSave: (data: Omit<BancoCreativo, 'id' | 'dataCriacao'>) => void;
    onClose: () => void;
}

const BancoCreativoForm = ({ onSave, onClose }: BancoCreativoFormProps) => {
    const [nome, setNome] = useState('');
    const [copy, setCopy] = useState('');
    const [videosLinks, setVideosLinks] = useState('');
    const [notas, setNotas] = useState('');
    const [status, setStatus] = useState<BancoCreativo['status']>('rascunho');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nome.trim()) return;

        onSave({
            nome,
            copy: copy.trim() || undefined,
            videosLinks: videosLinks.trim() || undefined,
            notas: notas.trim() || undefined,
            status,
        });

        setNome('');
        setCopy('');
        setVideosLinks('');
        setNotas('');
        setStatus('rascunho');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div className="space-y-2">
                <Label htmlFor="nome">Nome do Criativo *</Label>
                <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Criativo Summer Sale 2024"
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as BancoCreativo['status'])}
                    className="w-full bg-neutral-900 border-neutral-700 rounded-md px-3 py-2 text-sm"
                >
                    <option value="rascunho">📝 Rascunho</option>
                    <option value="pronto-para-editar">✅ Pronto para Editar</option>
                    <option value="em-edicao">✂️ Em Edição</option>
                    <option value="testando">🧪 Testando</option>
                </select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="copy">Copy do Criativo</Label>
                <Textarea
                    id="copy"
                    value={copy}
                    onChange={(e) => setCopy(e.target.value)}
                    placeholder="Cole aqui o texto que será usado no anúncio..."
                    rows={5}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="videosLinks">Links de Vídeos / Recursos</Label>
                <Textarea
                    id="videosLinks"
                    value={videosLinks}
                    onChange={(e) => setVideosLinks(e.target.value)}
                    placeholder="https://drive.google.com/...&#10;https://youtube.com/..."
                    rows={3}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="notas">Notas Adicionais</Label>
                <Textarea
                    id="notas"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Observações, ideias, referências..."
                    rows={3}
                />
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={!nome.trim()}>
                    Salvar no Banco
                </Button>
            </DialogFooter>
        </form>
    );
};

export default BancoCreativoForm;
