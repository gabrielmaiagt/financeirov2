import DashboardBoard from '@/components/dashboard/DashboardBoard';
import Header from '@/components/dashboard/Header';

export default function DashboardPage() {
    return (
        <div className="min-h-screen p-6 bg-gradient-to-b from-background to-neutral-950">
            <Header />
            <DashboardBoard />
        </div>
    );
}
