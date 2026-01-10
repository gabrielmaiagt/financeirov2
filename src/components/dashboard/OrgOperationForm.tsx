'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Operation, OperationCategory, AdCostMode, Partner } from '@/types/organization';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useOrgCollection, useOrgDoc } from '@/hooks/useFirestoreOrg';
import { Plus, Trash2 } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { serverTimestamp, updateDoc, doc } from 'firebase/firestore';

interface OperationFormProps {
  operation: Operation | null;
  onClose: () => void;
}

export function OrgOperationForm({ operation, onClose }: OperationFormProps) {
  const firestore = useFirestore();
  const { orgId } = useOrganization();
  const operationsCollection = useOrgCollection<Operation>('operations');

  const [name, setName] = useState(operation?.name || '');
  const [category, setCategory] = useState<OperationCategory>(operation?.category || 'other');
  const [partners, setPartners] = useState<Partner[]>(operation?.partners || [{ name: '', percentage: 100 }]);
  const [adCostMode, setAdCostMode] = useState<AdCostMode>(operation?.adCostMode || 'solo');
  const [adPayer, setAdPayer] = useState(operation?.adPayer || '');
  const [active, setActive] = useState(operation?.active ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalPercentage = partners.reduce((sum, p) => sum + (p.percentage || 0), 0);

  const handleAddPartner = () => {
    setPartners([...partners, { name: '', percentage: 0 }]);
  };

  const handleRemovePartner = (index: number) => {
    setPartners(partners.filter((_, i) => i !== index));
  };

  const handlePartnerChange = (index: number, field: keyof Partner, value: string | number) => {
    const updated = [...partners];
    updated[index] = { ...updated[index], [field]: value };
    setPartners(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🔍 Submit triggered:', { firestore: !!firestore, operationsCollection: !!operationsCollection, orgId });

    if (!firestore) {
      console.error('❌ Firestore not available');
      alert('Erro: Firestore não está inicializado. Tente recarregar a página.');
      return;
    }

    if (!orgId) {
      console.error('❌ orgId not available');
      alert('Erro: Organização não identificada. Faça logout e login novamente.');
      return;
    }

    if (!operationsCollection) {
      console.error('❌ operationsCollection not available');
      alert('Erro: Coleção de operações não disponível. Tente recarregar a página.');
      return;
    }

    if (totalPercentage !== 100) {
      alert('A soma das porcentagens deve ser exatamente 100%');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('📝 Creating operation with data:', { name, category, partners, adCostMode });

      // Sanitize partners data to ensure numbers are valid and no undefined values
      const sanitizedPartners: Partner[] = partners.map(p => {
        const partner: Partner = {
          name: p.name,
          percentage: Number(p.percentage) || 0,
          cashReservePercentage: p.cashReservePercentage ? (Number(p.cashReservePercentage) || 0) : 0,
        };
        if (p.userId) {
          partner.userId = p.userId;
        }
        return partner;
      });

      const operationData = {
        orgId,
        name,
        category,
        partners: sanitizedPartners,
        adCostMode,
        ...(adCostMode === 'reimburse_payer' ? { adPayer } : {}),
        active,
        updatedAt: serverTimestamp(),
      };

      if (operation) {
        // Update existing
        console.log('✏️ Updating existing operation:', operation.id);
        const docRef = doc(firestore, 'organizations', orgId, 'operations', operation.id);
        await updateDoc(docRef, operationData);
        console.log('✅ Operation updated successfully');
      } else {
        // Create new
        console.log('➕ Creating new operation...');
        await addDocumentNonBlocking(operationsCollection, {
          ...operationData,
          createdAt: serverTimestamp(),
        });
        console.log('✅ Operation created successfully');
      }

      onClose();
    } catch (error) {
      console.error('❌ Error saving operation:', error);
      alert(`Erro ao salvar operação: ${error instanceof Error ? error.message : 'Tente novamente.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Operação</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Madames Online - Front"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Categoria</Label>
        <Select value={category} onValueChange={(value) => setCategory(value as OperationCategory)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="infoproduct">Infoproduto</SelectItem>
            <SelectItem value="saas">SaaS</SelectItem>
            <SelectItem value="local_business">Negócio Local</SelectItem>
            <SelectItem value="course">Curso</SelectItem>
            <SelectItem value="extra_income">Renda Extra</SelectItem>
            <SelectItem value="other">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Sócios e Percentuais</Label>
          <Button type="button" variant="outline" size="sm" onClick={handleAddPartner}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar Sócio
          </Button>
        </div>

        {partners.map((partner, index) => (
          <div key={index} className="flex gap-2 items-end">
            <div className="flex-1">
              <Label htmlFor={`partner-name-${index}`} className="text-xs">Nome</Label>
              <Input
                id={`partner-name-${index}`}
                value={partner.name}
                onChange={(e) => handlePartnerChange(index, 'name', e.target.value)}
                placeholder="Nome do sócio"
                required
              />
            </div>
            <div className="w-20">
              <Label htmlFor={`partner-percentage-${index}`} className="text-xs">Part. %</Label>
              <Input
                id={`partner-percentage-${index}`}
                type="number"
                min="0"
                max="100"
                value={partner.percentage}
                onChange={(e) => handlePartnerChange(index, 'percentage', parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            <div className="w-20">
              <Label htmlFor={`partner-cash-${index}`} className="text-xs">Caixa %</Label>
              <Input
                id={`partner-cash-${index}`}
                type="number"
                min="0"
                max="100"
                value={partner.cashReservePercentage || 0}
                onChange={(e) => handlePartnerChange(index, 'cashReservePercentage', parseFloat(e.target.value) || 0)}
                placeholder="0"
                title="Contribuição para o caixa da empresa sobre a parte deste sócio"
              />
            </div>
            {partners.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive mb-0.5"
                onClick={() => handleRemovePartner(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}

        <p className={`text-sm ${totalPercentage === 100 ? 'text-green-400' : 'text-red-400'}`}>
          Total: {totalPercentage}% {totalPercentage !== 100 && '(deve ser 100%)'}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="adCostMode">Modo de Custo de Anúncios</Label>
        <Select value={adCostMode} onValueChange={(value) => setAdCostMode(value as AdCostMode)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solo">Operação Solo (100% para o dono)</SelectItem>
            <SelectItem value="reimburse_payer">Reembolsar Pagador (separa custo de anúncio)</SelectItem>
            <SelectItem value="split_among_partners">Dividir Entre Sócios</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {adCostMode === 'reimburse_payer' && (
        <div className="space-y-2">
          <Label htmlFor="adPayer">Quem Paga os Anúncios?</Label>
          <Select value={adPayer} onValueChange={setAdPayer}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o sócio" />
            </SelectTrigger>
            <SelectContent>
              {partners.map((partner, index) => (
                <SelectItem key={index} value={partner.name}>
                  {partner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Switch id="active" checked={active} onCheckedChange={setActive} />
        <Label htmlFor="active">Operação Ativa</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : (operation ? 'Salvar Alterações' : 'Criar Operação')}
        </Button>
      </div>
    </form>
  );
}
