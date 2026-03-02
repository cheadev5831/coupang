/**
 * GitHub Contents API를 통한 주문 데이터 파일 저장 서비스
 *
 * - 저장 경로: src/data/{yyyymm}.json (예: src/data/202603.json)
 * - 브랜치: main
 * - API: PUT https://api.github.com/repos/cheadev5831/coupang/contents/{path}
 */

import axios from 'axios';
import type { ProductRow } from 'src/data/default';
import type { SavedOrderData } from 'src/types/github';

/**
 * GitHub 레포의 src/data/{yyyymm}.json 을 읽어 주문 데이터를 반환.
 * 파일이 없거나 오류 시 null 반환.
 *
 * @param yyyymm  연월 문자열 (예: "202603")
 * @param token   GitHub Personal Access Token (없으면 public repo로 시도)
 */
export async function loadOrdersFromGitHub(
  yyyymm: string,
  token?: string | null,
): Promise<{ products: ProductRow[]; cancelledIds: Set<string> } | null> {
  const path = `src/data/${yyyymm}.json`;
  const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;

  try {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await axios.get<{ content: string; encoding: string }>(url, {
      params: { ref: BRANCH },
      headers,
    });

    // GitHub API는 base64로 인코딩된 content를 줄바꿈과 함께 반환
    const raw = response.data.content.replace(/\n/g, '');
    const json = decodeURIComponent(escape(atob(raw)));
    const data = JSON.parse(json) as SavedOrderData;

    return {
      products: data.products,
      cancelledIds: new Set(data.cancelledIds),
    };
  } catch {
    return null;
  }
}

const GITHUB_API_BASE = 'https://api.github.com';
const REPO_OWNER = 'cheadev5831';
const REPO_NAME = 'coupang';
const BRANCH = 'main';

/**
 * 지정 연월의 주문 데이터를 GitHub 레포의 src/data/{yyyymm}.json 으로 저장.
 * 파일이 이미 존재하면 덮어씀 (SHA 기반 업데이트).
 *
 * @param yyyymm     연월 문자열 (예: "202603")
 * @param products   상품 행 목록
 * @param cancelledIds 취소/반품 상품 ID Set
 * @param token      GitHub Personal Access Token (Contents: write 권한 필요)
 */
export async function saveOrdersToGitHub(
  yyyymm: string,
  products: ProductRow[],
  cancelledIds: Set<string>,
  token: string,
): Promise<void> {
  const path = `src/data/${yyyymm}.json`;
  const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;

  const data: SavedOrderData = {
    yyyymm,
    savedAt: new Date().toISOString(),
    products,
    cancelledIds: Array.from(cancelledIds),
  };

  // 한글 포함 JSON을 base64로 인코딩 (UTF-8 보장)
  const json = JSON.stringify(data, null, 2);
  const content = btoa(unescape(encodeURIComponent(json)));

  // 기존 파일 SHA 조회 (파일 업데이트 시 SHA 필수)
  let sha: string | undefined;
  try {
    const existing = await axios.get<{ sha: string }>(url, {
      params: { ref: BRANCH },
      headers: { Authorization: `Bearer ${token}` },
    });
    sha = existing.data.sha;
  } catch {
    // 파일 없음 → 신규 생성
  }

  await axios.put(
    url,
    {
      message: `feat: ${yyyymm} 주문 데이터 저장`,
      content,
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );
}
