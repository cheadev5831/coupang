/**
 * GitHub Contents API를 통해 주문 데이터를 레포지토리에 저장
 *
 * 저장 경로: public/data/YYYYMM.json (예: public/data/202603.json)
 * GitHub Actions가 빌드 후 data/YYYYMM.json 으로 정적 배포됨
 */

import axios from 'axios';
import type { ProductRow, StaticDataFile } from 'src/data/default';

/** UTF-8 문자열 → Base64 (한글 등 비ASCII 처리) */
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

/**
 * 주문 데이터를 GitHub 레포지토리에 저장하고 자동 배포를 트리거합니다.
 *
 * @param token  GitHub Personal Access Token (repo 권한 필요)
 * @param repo   "owner/repo" 형식 (예: "cheadev5831/coupang")
 */
export async function saveOrdersToGithub(
  token: string,
  repo: string,
  year: number,
  month: number,
  products: ProductRow[],
  cancelledIds: Set<string>,
): Promise<void> {
  const monthStr = String(month).padStart(2, '0');
  const filePath = `public/data/${year}${monthStr}.json`;

  const fileContent: StaticDataFile = {
    products,
    cancelledIds: [...cancelledIds],
    savedAt: new Date().toISOString(),
  };
  const encoded = utf8ToBase64(JSON.stringify(fileContent, null, 2));

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
  };

  // 기존 파일 SHA 조회 (수정 시 필요)
  let sha: string | undefined;
  try {
    const res = await axios.get<{ sha: string }>(
      `https://api.github.com/repos/${repo}/contents/${filePath}`,
      { headers, params: { ref: 'main' } },
    );
    sha = res.data.sha;
  } catch {
    // 파일 없음 → 신규 생성
  }

  await axios.put(
    `https://api.github.com/repos/${repo}/contents/${filePath}`,
    {
      message: `data: ${year}년 ${month}월 주문 데이터 업데이트`,
      content: encoded,
      branch: 'main',
      ...(sha ? { sha } : {}),
    },
    { headers },
  );
}
