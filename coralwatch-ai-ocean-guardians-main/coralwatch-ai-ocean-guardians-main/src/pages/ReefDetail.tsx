import { useParams, Link } from 'react-router-dom';
import Header from '@/components/Header';
import { ReefDetailPanel } from '@/components/ReefDetailPanel';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ReefDetail() {
    const { reefId } = useParams<{ reefId: string }>();

    if (!reefId) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <main className="container mx-auto px-4 py-12 text-center text-muted-foreground">
                    Invalid reef ID.
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto px-4 py-8 max-w-3xl">
                <Link to="/dashboard">
                    <Button variant="ghost" size="sm" className="mb-6 gap-2">
                        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                    </Button>
                </Link>
                <ReefDetailPanel reefId={reefId} />
            </main>
        </div>
    );
}
