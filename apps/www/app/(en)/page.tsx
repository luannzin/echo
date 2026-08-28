import { Page } from "@/components/page";
import { en } from "@/content/en";

/** English keeps `/`, so every link and card that already points at echo still resolves. */
const EnglishPage = () => <Page content={en} />;

export default EnglishPage;
