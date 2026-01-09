'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Smartphone, Copy, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WidgetConfigCard() {
    const { user } = useAuth();
    const { orgId } = useOrganization();
    const [token, setToken] = useState<string | null>(null);
    const [lastUsedAt, setLastUsedAt] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user && orgId) {
            loadToken();
        }
    }, [user, orgId]);

    const loadToken = async () => {
        try {
            setIsLoading(true);
            const idToken = await user?.getIdToken();
            const response = await fetch(`/api/widget-token?orgId=${orgId}`, {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                },
            });

            const data = await response.json();
            if (data.success) {
                setToken(data.token);
                setLastUsedAt(data.lastUsedAt);
            }
        } catch (err: any) {
            console.error('Error loading token:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const generateToken = async () => {
        try {
            setIsGenerating(true);
            setError('');
            const idToken = await user?.getIdToken();
            const response = await fetch('/api/widget-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    action: 'generate',
                    orgId: orgId,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setToken(data.token);
                setLastUsedAt(null);
            } else {
                setError(data.error || 'Erro ao gerar token');
            }
        } catch (err: any) {
            setError('Erro de conexão: ' + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const revokeToken = async () => {
        if (!confirm('Tem certeza que deseja revogar o token? O widget parará de funcionar.')) {
            return;
        }

        try {
            setIsGenerating(true);
            setError('');
            const idToken = await user?.getIdToken();
            const response = await fetch('/api/widget-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    action: 'revoke',
                    orgId: orgId,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setToken(null);
                setLastUsedAt(null);
            } else {
                setError(data.error || 'Erro ao revogar token');
            }
        } catch (err: any) {
            setError('Erro de conexão: ' + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToken = () => {
        if (token) {
            navigator.clipboard.writeText(token);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const scriptableCode = `// Widget Vendas do Dia - Scriptable
const API_URL = "https://financeiro.fluxodeoferta.site/api/widget-data";
const TOKEN = "${token || 'SEU_TOKEN_AQUI'}";

let widget = new ListWidget();
widget.backgroundColor = new Color("#1a1a1a");
widget.setPadding(16, 16, 16, 16);

try {
  let req = new Request(\`\${API_URL}?token=\${TOKEN}\`);
  req.headers = {
    "Accept": "application/json",
    "User-Agent": "Scriptable/1.0"
  };
  
  let rawRes = await req.loadString();
  let res = JSON.parse(rawRes);
  
  if (!res.success || !res.data) {
    throw new Error(res.error || "Dados inválidos");
  }
  
  // Header com ícone
  let header = widget.addText("🚀 Vendas Hoje");
  header.textColor = new Color("#94a3b8");
  header.font = Font.semiboldSystemFont(12);
  
  widget.addSpacer(12);
  
  // Faturamento (destaque principal)
  let revenue = widget.addText(res.data.revenue_formatted);
  revenue.textColor = new Color("#ffffff");
  revenue.font = Font.boldSystemFont(22);
  
  widget.addSpacer(6);
  
  // Quantidade de vendas
  let sales = widget.addText(res.data.approved_sales + " vendas");
  sales.textColor = new Color("#94a3b8");
  sales.font = Font.mediumSystemFont(14);

} catch (e) {
  console.error("Erro:", e.message);
  let errText = widget.addText("❌ " + e.message);
  errText.textColor = Color.red();
  errText.font = Font.systemFont(11);
}

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentSmall();
}

Script.complete();`;

    if (isLoading) {
        return (
            <Card className="border-neutral-800">
                <CardContent className="flex justify-center items-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-neutral-800">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-blue-500" />
                    <CardTitle>Widget Mobile</CardTitle>
                </div>
                <CardDescription>
                    Acompanhe suas métricas direto da tela inicial do seu celular
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Token Section */}
                <div className="space-y-3">
                    <div>
                        <h3 className="text-sm font-semibold mb-1">Credenciais de Acesso</h3>
                        <p className="text-xs text-muted-foreground">
                            Este token é a chave para visualizar seus dados fora do painel.
                        </p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                            ⚠️ Ele concede acesso de leitura ao seu faturamento. Não compartilhe.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Seu Token Pessoal</label>
                        {token ? (
                            <div className="flex gap-2">
                                <Input
                                    value={token}
                                    readOnly
                                    className="font-mono text-xs bg-neutral-900 border-neutral-800"
                                />
                                <Button
                                    onClick={copyToken}
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0"
                                >
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Nenhum token gerado</p>
                        )}

                        {lastUsedAt && (
                            <p className="text-xs text-muted-foreground">
                                Último uso: {new Date(lastUsedAt).toLocaleString('pt-BR')}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={generateToken}
                            disabled={isGenerating}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isGenerating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            {token ? 'Gerar Novo Token' : 'Gerar Token'}
                        </Button>
                        {token && (
                            <Button
                                onClick={revokeToken}
                                disabled={isGenerating}
                                variant="destructive"
                            >
                                Revogar
                            </Button>
                        )}
                    </div>
                </div>

                {/* Instructions */}
                <div className="space-y-3 pt-6 border-t border-neutral-800">
                    <h3 className="text-sm font-semibold">📱 Instalação Widget (iOS)</h3>
                    <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                        <li>Baixe o app <strong>Scriptable</strong> na App Store (Gratuito)</li>
                        <li>Abra o app e toque no <strong>+</strong> (topo direito)</li>
                        <li>Apague o código e cole o script abaixo</li>
                        <li>Renomeie para <strong>Financeiro</strong></li>
                        <li>Toque em <strong>Done</strong> e volte à tela inicial</li>
                        <li>Segure na tela → <strong>+</strong> → busque <strong>Scriptable</strong></li>
                        <li>Adicione o widget (tamanho pequeno ou médio)</li>
                        <li>Segure no widget → <strong>Edit Widget</strong></li>
                        <li>Em Script, selecione <strong>Financeiro</strong></li>
                        <li>Em When Interacting, mude para <strong>Run Script</strong></li>
                    </ol>
                </div>

                {/* Script */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold">Script do Widget</label>
                        <Button
                            onClick={() => {
                                navigator.clipboard.writeText(scriptableCode);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            variant="outline"
                            size="sm"
                        >
                            {copied ? <Check className="mr-2 h-3 w-3" /> : <Copy className="mr-2 h-3 w-3" />}
                            Copiar Código
                        </Button>
                    </div>
                    <pre className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 text-xs overflow-x-auto max-h-96 overflow-y-auto">
                        <code className="text-neutral-300">{scriptableCode}</code>
                    </pre>
                </div>
            </CardContent>
        </Card>
    );
}
