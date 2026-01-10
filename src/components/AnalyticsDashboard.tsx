'use client';

import { Card } from "@/components/ui/card";
import { TrendingUp, DollarSign, Users, Activity } from "lucide-react";
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export function AnalyticsDashboard() {
    // Revenue Trend Data (Area Chart)
    const revenueTrendData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
        datasets: [{
            label: 'Revenue',
            data: [100, 150, 180, 220, 280, 350, 420, 480, 550],
            fill: true,
            backgroundColor: (context: any) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, 'rgba(56, 189, 248, 0.5)');
                gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.3)');
                gradient.addColorStop(1, 'rgba(168, 85, 247, 0.1)');
                return gradient;
            },
            borderColor: 'rgb(56, 189, 248)',
            borderWidth: 3,
            tension: 0.4,
            pointRadius: 0,
        }]
    };

    // Monthly Revenue vs Expenses (Bar Chart)
    const barChartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            {
                label: 'Revenue',
                data: [320, 350, 400, 380, 460, 520],
                backgroundColor: 'rgb(56, 189, 248)',
            },
            {
                label: 'Expenses',
                data: [280, 290, 310, 320, 350, 380],
                backgroundColor: 'rgb(139, 92, 246)',
            }
        ]
    };

    // Expense Distribution (Donut Chart)
    const donutData = {
        labels: ['Marketing', 'R&D', 'Operations'],
        datasets: [{
            data: [35, 30, 35],
            backgroundColor: [
                'rgb(52, 211, 153)',
                'rgb(56, 189, 248)',
                'rgb(139, 92, 246)',
            ],
            borderWidth: 0,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            y: {
                grid: {
                    color: 'rgba(51, 65, 85, 0.3)',
                    drawBorder: false,
                },
                ticks: {
                    color: 'rgb(148, 163, 184)',
                    callback: function (value: any) {
                        return value + 'K';
                    }
                }
            },
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: 'rgb(148, 163, 184)',
                }
            }
        }
    };

    const donutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
        cutout: '70%',
    };

    return (
        <div className="min-h-screen bg-[#0f1419] text-white p-6">
            <div className="max-w-[1600px] mx-auto">
                {/* Top Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Total Revenue */}
                    <Card className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border-emerald-500/30 p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-neutral-400 mb-1">Total Revenue</p>
                                <p className="text-3xl font-bold">$1,227.8M</p>
                                <p className="text-sm text-emerald-400 mt-1">+1.68%</p>
                            </div>
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-emerald-400" />
                            </div>
                        </div>
                    </Card>

                    {/* Profit Margin */}
                    <Card className="bg-gradient-to-br from-cyan-500/20 to-purple-500/10 border-cyan-500/30 p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-neutral-400 mb-1">Profit Margin</p>
                                <p className="text-3xl font-bold">36.73%</p>
                                <p className="text-sm text-cyan-400 mt-1">+1.08%</p>
                            </div>
                            <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-cyan-400" />
                            </div>
                        </div>
                    </Card>

                    {/* Active Users */}
                    <Card className="bg-gradient-to-br from-purple-500/20 to-violet-500/10 border-purple-500/30 p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-neutral-400 mb-1">Active Users</p>
                                <p className="text-3xl font-bold">1,287</p>
                                <p className="text-sm text-purple-400 mt-1">+1.80%</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                <Users className="w-6 h-6 text-purple-400" />
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Revenue Trend - Large */}
                    <Card className="lg:col-span-2 bg-gradient-to-br from-[#1a232e] to-[#0f1419] border-slate-700/50 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Revenue Trend (YTD)</h3>
                            <select className="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-sm">
                                <option>Month</option>
                                <option>Year</option>
                            </select>
                        </div>
                        <div className="h-[300px]">
                            <Line data={revenueTrendData} options={chartOptions} />
                        </div>
                    </Card>

                    {/* Expense Distribution - Donut */}
                    <Card className="bg-gradient-to-br from-[#1a232e] to-[#0f1419] border-slate-700/50 p-6">
                        <h3 className="text-lg font-semibold mb-4">Expense Distribution</h3>
                        <div className="h-[200px] mb-4">
                            <Doughnut data={donutData} options={donutOptions} />
                        </div>
                        <div className="space-y-2">
                            {donutData.labels.map((label, index) => (
                                <div key={label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: donutData.datasets[0].backgroundColor[index] }}
                                        />
                                        <span className="text-sm text-neutral-400">{label}</span>
                                    </div>
                                    <span className="text-sm font-medium">{donutData.datasets[0].data[index]}%</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Monthly Revenue vs Expenses - Bar Chart */}
                <Card className="mt-6 bg-gradient-to-br from-[#1a232e] to-[#0f1419] border-slate-700/50 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Monthly Revenue vs. Expenses</h3>
                        <select className="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-sm">
                            <option>Jan-Apr</option>
                            <option>All Year</option>
                        </select>
                    </div>
                    <div className="h-[250px]">
                        <Bar data={barChartData} options={chartOptions} />
                    </div>
                </Card>
            </div>
        </div>
    );
}
