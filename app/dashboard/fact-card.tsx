import { createFactForUser } from "@/lib/facts";

type Props = { userId: string; movie: string };

export default async function FactCard({ userId, movie }: Props) {
    let content: string | null = null;

    try {
        const fact = await createFactForUser(userId, movie);
        content = fact.content;
    } catch (err) {
        console.error("Fact generation failed:", err);
    }

    if (!content) {
        return (
            <p className="text-sm text-red-600">
                We couldn't come up with a fun fact right now. Refresh to try again.
            </p>
        );
    }

    return <p className="text-gray-800">{content}</p>;
}