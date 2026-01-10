'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, Zap, TrendingUp, Shield, Smartphone, BarChart3, ArrowRight, ChevronDown, Star, X, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
    const [faqOpen, setFaqOpen] = useState<number | null>(null);
    const [videoOpen, setVideoOpen] = useState(false);

    // ... (features, testimonials, faqs arrays permanecem iguais)
    const features = [
        {
            icon: <TrendingUp className="w-6 h-6" />,
            title: "Divisão Automática de Lucros",
            description: "Calcule e distribua lucros entre sócios automaticamente com total precisão"
        },
        {
            icon: <BarChart3 className="w-6 h-6" />,
            title: "Dashboard em Tempo Real",
            description: "Visualize métricas, vendas e faturamento instantaneamente"
        },
        {
            icon: <Smartphone className="w-6 h-6" />,
            title: "Widget iOS Exclusivo",
            description: "Acompanhe vendas do dia direto na tela inicial do iPhone"
        },
        {
            icon: <Zap className="w-6 h-6" />,
            title: "Webhooks Integrados",
            description: "Conecte Frendz, Paradise, Buckpay e GGCheckout automaticamente"
        },
        {
            icon: <Shield className="w-6 h-6" />,
            title: "100% Seguro",
            description: "Dados criptografados no Firebase com autenticação de 2 fatores"
        },
        {
            icon: <Smartphone className="w-6 h-6" />,
            title: "Economize Horas",
            description: "Automatize tarefas que levavam horas em poucos cliques"
        }
    ];

    const testimonials = [
        {
            name: "Carlos Mendes",
            role: "CEO, Escala Digital",
            text: "Reduzimos 90% do tempo gasto com divisão de lucros. Simplesmente indispensável!",
            rating: 5
        },
        {
            name: "Marina Silva",
            role: "Gestora Financeira",
            text: "A integração com os gateways é perfeita. Não consigo mais trabalhar sem.",
            rating: 5
        },
        {
            name: "Roberto Costa",
            role: "Sócio, Agência Premium",
            text: "O widget iOS é genial. Acompanho tudo sem nem abrir o app!",
            rating: 5
        },
        {
            name: "Ana Paula Rodrigues",
            role: "Fundadora, InfoProduto Brasil",
            text: "Finalmente um painel que entende o mercado brasileiro. Vale cada centavo!",
            rating: 5
        },
        {
            name: "Pedro Oliveira",
            role: "CFO, StartUp XYZ",
            text: "Automação real de verdade. O que levava horas agora é automático. Incrível!",
            rating: 5
        },
        {
            name: "Juliana Santos",
            role: "E-commerce Manager",
            text: "Transparência total com os sócios. Acabou a dor de cabeça no fim do mês.",
            rating: 5
        }
    ];

    const faqs = [
        {
            question: "Como funciona a divisão automática de lucros?",
            answer: "Você configura os percentuais de cada sócio uma única vez. Toda vez que uma venda entra, o sistema calcula automaticamente quanto cada um recebe, incluindo reserva de caixa da empresa."
        },
        {
            question: "Quais gateways de pagamento são suportados?",
            answer: "Atualmente suportamos Frendz, Paradise, Buckpay e GGCheckout. Novos gateways são adicionados regularmente conforme demanda."
        },
        {
            question: "Posso cancelar a qualquer momento?",
            answer: "Sim! Não há fidelidade. Cancele quando quiser e continue usando até o fim do período pago."
        },
        {
            question: "Os dados são seguros?",
            answer: "Absolutamente. Usamos Firebase (Google) para armazenamento com criptografia de ponta a ponta e autenticação segura."
        },
        {
            question: "Preciso de conhecimento técnico?",
            answer: "Não! A interface é intuitiva e pensada para não-técnicos. Se souber usar um celular, vai conseguir usar o painel."
        },
        {
            question: "Existe período de teste grátis?",
            answer: "Sim! Oferecemos 7 dias de garantia incondicional. Se não gostar, devolvemos 100% do seu dinheiro sem perguntas."
        },
        {
            question: "Como funciona o Widget iOS?",
            answer: "O widget mostra suas vendas do dia direto na tela inicial do iPhone. Basta adicionar o widget do Safari e configurar a URL do seu painel."
        },
        {
            question: "Posso ter múltiplas operações?",
            answer: "Sim! Você pode criar quantas operações quiser (diferentes produtos, serviços, etc.) e cada uma com sua própria divisão de lucros."
        },
        {
            question: "Como configuro os webhooks?",
            answer: "No painel Admin, você encontra as URLs de webhook prontas para copiar e colar nas configurações do seu gateway de pagamento. É literalmente copiar e colar."
        },
        {
            question: "O suporte está incluído?",
            answer: "Sim! Suporte prioritário via WhatsApp está incluído em todos os planos. Respondemos em até 2 horas úteis."
        },
        {
            question: "Posso exportar os dados?",
            answer: "Sim! Você pode exportar relatórios em PDF e Excel a qualquer momento. Seus dados são seus e você tem controle total."
        },
        {
            question: "Há limite de vendas ou transações?",
            answer: "Não! Processo ilimitado de transações. Seja você faturando R$ 10mil ou R$ 10 milhões por mês, o preço é o mesmo."
        }
    ];

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden">
            {/* Video Demo Modal */}
            <AnimatePresence>
                {videoOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setVideoOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-4xl aspect-video bg-neutral-900 rounded-2xl overflow-hidden border border-primary/30 shadow-2xl shadow-primary/20"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setVideoOpen(false)}
                                className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center z-10 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <iframe
                                className="w-full h-full"
                                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                                title="Demo do Painel Financeiro"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Background Effects */}
            <div className="fixed inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-black via-neutral-950 to-black" />
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            {/* Hero Section */}
            <section className="relative pt-20 pb-32 px-4">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
                            <Zap className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">Economize 10+ horas por semana</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-primary to-white bg-clip-text text-transparent leading-tight">
                            Pare de Perder Tempo<br />
                            com Planilhas
                        </h1>

                        <p className="text-xl md:text-2xl text-neutral-400 mb-12 max-w-3xl mx-auto">
                            O painel financeiro que <span className="text-primary font-semibold">automatiza divisão de lucros</span> e
                            te dá controle total do seu negócio em tempo real
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <Link href="/signup">
                                <Button
                                    size="lg"
                                    className="relative text-lg px-8 py-7 bg-gradient-to-r from-primary via-emerald-500 to-primary bg-[length:200%_100%] hover:bg-[position:100%_0] transition-all duration-500 shadow-lg shadow-primary/50 hover:shadow-xl hover:shadow-primary/60 hover:scale-105 font-bold group border-2 border-primary/20"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        🚀 Começar Agora - R$ 29,90/mês
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
                                </Button>
                            </Link>
                            <Button
                                size="lg"
                                variant="outline"
                                className="text-lg px-8 py-7 border-2 border-neutral-700 hover:bg-neutral-900 hover:border-primary/50 transition-all group"
                                onClick={() => setVideoOpen(true)}
                            >
                                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                                Ver Demo em Vídeo
                            </Button>
                        </div>

                        <p className="text-sm text-neutral-500 mt-6">
                            ✓ Sem fidelidade • ✓ Cancele quando quiser • ✓ Suporte incluído
                        </p>
                    </motion.div>

                    {/* Hero Visual with Real Image */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="mt-16"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-emerald-500/30 blur-3xl" />
                            <div className="relative rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl">
                                <Image
                                    src="/lp-assets/dashboard.png"
                                    alt="Dashboard do Painel Financeiro"
                                    width={1200}
                                    height={800}
                                    className="w-full h-auto"
                                    priority
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Social Proof - unchanged */}
            <section className="py-12 border-y border-neutral-800 bg-neutral-950/50">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                            <div className="text-4xl font-bold text-primary mb-2">500+</div>
                            <div className="text-sm text-neutral-400">Empresas Ativas</div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                            <div className="text-4xl font-bold text-primary mb-2">R$ 2M+</div>
                            <div className="text-sm text-neutral-400">Processados/Mês</div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                            <div className="text-4xl font-bold text-primary mb-2">4.9★</div>
                            <div className="text-sm text-neutral-400">Avaliação Média</div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
                            <div className="text-4xl font-bold text-primary mb-2">10h+</div>
                            <div className="text-sm text-neutral-400">Economizadas/Semana</div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features with Images */}
            <section className="py-32 px-4">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Tudo que Você Precisa<br />
                            em <span className="text-primary">Um Só Lugar</span>
                        </h2>
                        <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
                            Automatize processos, economize tempo e tome decisões baseadas em dados reais
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="p-6 bg-gradient-to-br from-neutral-900/90 to-neutral-950/90 border-neutral-800 hover:border-primary/50 transition-all duration-300 group cursor-pointer h-full">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                                        {feature.title}
                                    </h3>
                                    <p className="text-neutral-400">
                                        {feature.description}
                                    </p>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {/* Product Screenshots */}
                    <div className="grid md:grid-cols-2 gap-8">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-emerald-500/20 blur-2xl group-hover:blur-3xl transition-all" />
                            <div className="relative rounded-xl overflow-hidden border border-neutral-800 group-hover:border-primary/50 transition-all">
                                <Image
                                    src="/lp-assets/analytics.png"
                                    alt="Analytics Dashboard"
                                    width={600}
                                    height={400}
                                    className="w-full h-auto"
                                />
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-l from-primary/20 to-emerald-500/20 blur-2xl group-hover:blur-3xl transition-all" />
                            <div className="relative rounded-xl overflow-hidden border border-neutral-800 group-hover:border-primary/50 transition-all">
                                <Image
                                    src="/lp-assets/widget.png"
                                    alt="Widget iOS"
                                    width={600}
                                    height={400}
                                    className="w-full h-auto"
                                />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* How It Works - unch

anged from original */}
            <section className="py-32 px-4 bg-neutral-950/50">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Simples. <span className="text-primary">Rápido. Eficiente.</span>
                        </h2>
                        <p className="text-xl text-neutral-400">
                            Comece a usar em menos de 5 minutos
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { step: "1", title: "Crie sua Conta", desc: "Cadastro rápido com Google ou email" },
                            { step: "2", title: "Configure Sócios", desc: "Defina percentuais uma única vez" },
                            { step: "3", title: "Conecte Gateways", desc: "Webhooks automáticos em 1 clique" }
                        ].map((item, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.2 }}
                                className="relative"
                            >
                                {index < 2 && (
                                    <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                                )}
                                <div className="text-center">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center text-4xl font-bold mx-auto mb-6 shadow-lg shadow-primary/50">
                                        {item.step}
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                                    <p className="text-neutral-400">{item.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials - unchanged */}
            <section className="py-32 px-4">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Quem Usa <span className="text-primary">Recomenda</span>
                        </h2>
                        <p className="text-xl text-neutral-400">
                            Veja o que nossos clientes têm a dizer
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {testimonials.map((testimonial, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="p-6 bg-gradient-to-br from-neutral-900/90 to-neutral-950/90 border-neutral-800 h-full">
                                    <div className="flex gap-1 mb-4">
                                        {[...Array(testimonial.rating)].map((_, i) => (
                                            <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                                        ))}
                                    </div>
                                    <p className="text-neutral-300 mb-6 italic">"{testimonial.text}"</p>
                                    <div>
                                        <p className="font-bold">{testimonial.name}</p>
                                        <p className="text-sm text-neutral-400">{testimonial.role}</p>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing - IMPROVED FOR MOBILE */}
            <section className="py-32 px-4 bg-neutral-950/50">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Um Preço. <span className="text-primary">Tudo Incluído.</span>
                        </h2>
                        <p className="text-xl text-neutral-400">
                            Sem pegadinhas, sem taxas escondidas
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <Card className="relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-950 to-black border-2 border-primary/50 shadow-2xl shadow-primary/20">
                            <div className="absolute top-0 right-0 bg-gradient-to-r from-primary to-emerald-500 text-black px-4 md:px-6 py-2 text-xs md:text-sm font-bold">
                                MAIS POPULAR
                            </div>
                            <div className="p-6 md:p-12">
                                <div className="text-center mb-8">
                                    <p className="text-neutral-400 mb-2 text-sm md:text-base">Plano Mensal</p>
                                    <div className="flex items-baseline justify-center gap-2">
                                        <span className="text-4xl md:text-6xl font-bold text-primary">R$ 29,90</span>
                                        <span className="text-xl md:text-2xl text-neutral-400">/mês</span>
                                    </div>
                                    <p className="text-xs md:text-sm text-neutral-500 mt-2">Aproximadamente R$ 1,00 por dia</p>
                                </div>

                                <ul className="space-y-3 md:space-y-4 mb-8 max-h-[400px] md:max-h-none overflow-y-auto px-2">
                                    {[
                                        "Divisão Automática de Lucros Ilimitada",
                                        "Dashboard em Tempo Real",
                                        "Widget iOS Exclusivo",
                                        "Integração com Todos os Gateways",
                                        "Múltiplas Operações e Sócios",
                                        "Notificações de Vendas",
                                        "Relatórios Personalizados",
                                        "Suporte Prioritário via WhatsApp",
                                        "Atualizações e Novos Recursos Grátis",
                                        "Backup Automático Diário"
                                    ].map((item, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <Check className="w-5 h-5 md:w-6 md:h-6 text-primary flex-shrink-0 mt-0.5" />
                                            <span className="text-sm md:text-base text-neutral-300">{item}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Link href="/signup">
                                    <Button
                                        size="lg"
                                        className="w-full text-base md:text-lg py-6 md:py-7 bg-gradient-to-r from-primary via-emerald-500 to-primary bg-[length:200%_100%] hover:bg-[position:100%_0] transition-all duration-500 shadow-lg shadow-primary/50 hover:shadow-xl hover:shadow-primary/60 hover:scale-105 font-bold group border-2 border-primary/20"
                                    >
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            🚀 Começar Agora - R$ 29,90/mês
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </span>
                                    </Button>
                                </Link>

                                <p className="text-center text-xs md:text-sm text-neutral-500 mt-6">
                                    🔒 Pagamento seguro • Cancele quando quiser
                                </p>
                            </div>
                        </Card>
                    </motion.div>

                    <div className="text-center mt-12">
                        <p className="text-sm md:text-base text-neutral-400">
                            Prefere pagar anualmente e <span className="text-primary font-bold">economizar 20%</span>?{' '}
                            <Link href="#" className="text-primary hover:underline">Fale conosco</Link>
                        </p>
                    </div>
                </div>
            </section>

            {/* FAQ - unchanged from original */}
            <section className="py-32 px-4">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Perguntas <span className="text-primary">Frequentes</span>
                        </h2>
                        <p className="text-xl text-neutral-400">
                            Tudo que você precisa saber
                        </p>
                    </motion.div>

                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <button
                                    onClick={() => setFaqOpen(faqOpen === index ? null : index)}
                                    className="w-full p-6 bg-gradient-to-br from-neutral-900/90 to-neutral-950/90 border border-neutral-800 rounded-lg hover:border-primary/50 transition-all text-left"
                                >
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-bold pr-8">{faq.question}</h3>
                                        <ChevronDown
                                            className={`w-6 h-6 text-primary flex-shrink-0 transition-transform ${faqOpen === index ? 'rotate-180' : ''
                                                }`}
                                        />
                                    </div>
                                    {faqOpen === index && (
                                        <motion.p
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mt-4 text-neutral-400"
                                        >
                                            {faq.answer}
                                        </motion.p>
                                    )}
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Final with Better Button */}
            <section className="py-32 px-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-emerald-500/20 to-primary/20 blur-3xl" />
                <div className="max-w-4xl mx-auto text-center relative">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-6xl font-bold mb-6">
                            Pronto para <span className="text-primary">Automatizar</span><br />
                            seu Financeiro?
                        </h2>
                        <p className="text-xl text-neutral-400 mb-12 max-w-2xl mx-auto">
                            Junte-se a centenas de empresas que já economizam horas e aumentam lucros com nosso painel
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/signup">
                                <Button
                                    size="lg"
                                    className="relative text-xl px-12 py-8 bg-gradient-to-r from-primary via-emerald-500 to-primary bg-[length:200%_100%] hover:bg-[position:100%_0] transition-all duration-500 shadow-2xl shadow-primary/50 hover:shadow-[0_0_50px_rgba(var(--primary),0.8)] hover:scale-110 font-bold group border-2 border-primary/20 overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        🎯 Começar Agora - R$ 29,90/mês
                                        <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                </Button>
                            </Link>
                        </div>

                        <p className="text-sm text-neutral-500 mt-8">
                            Não precisa cartão de crédito para testar • 7 dias de garantia
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Footer - unchanged */}
            <footer className="border-t border-neutral-800 py-12 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <h3 className="font-bold text-lg mb-4">Painel Financeiro</h3>
                            <p className="text-sm text-neutral-400">
                                Automatize divisão de lucros e controle seu negócio em tempo real.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Produto</h4>
                            <ul className="space-y-2 text-sm text-neutral-400">
                                <li><Link href="#" className="hover:text-primary">Funcionalidades</Link></li>
                                <li><Link href="#" className="hover:text-primary">Preços</Link></li>
                                <li><Link href="#" className="hover:text-primary">Demo</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Suporte</h4>
                            <ul className="space-y-2 text-sm text-neutral-400">
                                <li><Link href="#" className="hover:text-primary">Central de Ajuda</Link></li>
                                <li><Link href="#" className="hover:text-primary">WhatsApp</Link></li>
                                <li><Link href="#" className="hover:text-primary">FAQ</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-neutral-400">
                                <li><Link href="#" className="hover:text-primary">Termos de Uso</Link></li>
                                <li><Link href="#" className="hover:text-primary">Privacidade</Link></li>
                                <li><Link href="#" className="hover:text-primary">Política de Cookies</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-neutral-800 pt-8 text-center text-sm text-neutral-500">
                        <p>© 2026 Painel Financeiro. Todos os direitos reservados.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
