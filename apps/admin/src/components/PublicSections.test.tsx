import { describe, expect, it } from "@jest/globals";
import { renderToStaticMarkup } from "react-dom/server";
import { FeatureMatrix, defaultFeatures } from "./FeatureMatrix";
import { LearningLoop } from "./LearningLoop";
import { PillarGrid } from "./PillarGrid";
import { TrustBand } from "./TrustBand";

describe("public landing-page sections", () => {
  it("renders the learning loop as an ordered four-step process", () => {
    const html = renderToStaticMarkup(<LearningLoop />);

    expect(html).toContain('aria-labelledby="learning-loop-title"');
    expect(html.match(/<li/g)).toHaveLength(4);
    expect(html).toContain("理解");
    expect(html).toContain("適時複習");
    expect(html).not.toContain("placeholder");
  });

  it("renders three distinct product pillars", () => {
    const html = renderToStaticMarkup(<PillarGrid />);

    expect(html.match(/<article/g)).toHaveLength(3);
    expect(html).toContain("AI 是輔助，不是答案");
    expect(html).toContain("進度看得見");
  });

  it("renders a semantic feature table without emoji status icons", () => {
    const html = renderToStaticMarkup(<FeatureMatrix features={defaultFeatures} />);

    expect(html).toContain("<caption");
    expect(html).toContain('scope="col"');
    expect(html).toContain('scope="row"');
    expect(html).toContain("需要已驗證 learner 帳號");
    expect(html).toContain("網頁版未提供");
    expect(html).not.toMatch(/[✅❌]/u);
  });

  it("uses truthful, variant-specific trust messages", () => {
    const aiHtml = renderToStaticMarkup(<TrustBand variant="ai" />);
    const privacyHtml = renderToStaticMarkup(<TrustBand variant="privacy" />);

    expect(aiHtml).toContain("AI 可能出錯");
    expect(privacyHtml).toContain("依功能需要由受保護的服務處理");
    expect(privacyHtml).not.toContain("不會將您的學習資料");
  });
});
