/* eslint-disable */
// Google Apps Script 참고 코드 — 빌드 대상 아님
function onEdit(e) {
  const sheet = e.source.getSheetByName('List'); // 시트 이름
  const range = e.range;

  // 마스터 체크박스 위치 (F7)
  const masterRow = 7;
  const masterCol = 6; // F열 = 7번

  // 마스터 체크박스가 눌린 경우만 실행
  if (range.getRow() === masterRow && range.getColumn() === masterCol) {
    const masterValue = range.getValue(); // TRUE/FALSE

    // 데이터 체크박스 범위 (F8 ~ F마지막행)
    const startRow = masterRow + 1;
    const lastRow = sheet.getLastRow();

    const boxRange = sheet.getRange(startRow, masterCol, lastRow - startRow + 1, 1);
    boxRange.setValue(masterValue); // 전체 체크/해제
  }
}

function fetchCoupang() {
  const 시트이름 = 'List';
  const 쿠키위치 = 'A2';
  const 제목행번호 = 7;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const listSheet = ss.getSheetByName(시트이름);

  const year = String(listSheet.getRange('A5').getValue());
  const month = String(listSheet.getRange('B5').getValue()).padStart(2, '0');
  const day = '01';
  const searchDate = year + month + day;
  console.log(searchDate);

  // 목록 초기화
  const headerRow = 제목행번호; // "Order ID"가 있는 행 번호
  const last = listSheet.getLastRow(); // 실제 마지막 데이터 행
  if (last > headerRow) {
    listSheet
      .getRange(headerRow + 1, 1, last - headerRow, listSheet.getLastColumn())
      .clearContent();
  }

  const cookie = listSheet.getRange(쿠키위치).getValue();

  if (!cookie) {
    SpreadsheetApp.getUi().alert('Enter the Cookie in cell A2 of the “List” sheet.');
    return;
  }
  console.log(cookie);
  const size = 10;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    // API 호출
    const apiUrl = `https://mc.coupang.com/ssr/api/myorders/model/page?requestYear=${year}&pageIndex=${page}&size=${size}`;

    const res = UrlFetchApp.fetch(apiUrl, {
      method: 'get',
      headers: {
        Cookie: cookie,
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json',
      },
      muteHttpExceptions: true,
    });

    const status = res.getResponseCode();
    const text = res.getContentText();
    console.log(status);
    if (status !== 200) {
      SpreadsheetApp.getUi().alert(`Request fail. Status=${status}\n${text}`);
      return;
    }

    const json = JSON.parse(text);

    // 주문목록 가져오기
    let temp = json.orderList.flatMap((order) => {
      const orderId = order.orderId;
      const d = new Date(order.orderedAt);
      const orderDate = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      const baseDeliveryPrice = order.baseDeliveryPrice;
      return order.deliveryGroupList.flatMap((group) => {
        const status = group.groupStatus?.status || '';

        return group.productList.map((p) => ({
          orderId,
          orderDate,
          title: p.productName,
          totalProductPrice: p.discountedUnitPrice * p.quantity + baseDeliveryPrice,
          status,
          imagePath: p.imagePath,
        }));
      });
    });

    //console.log(temp)

    // 다음페이지 세팅
    page++;
    hasMore = !temp.some((r) => {
      const date = r.orderDate; // '20251030' 이런 형식
      return date < searchDate; // 문자열 비교 OK (YYYYMMDD 형식)
    });
    console.log(hasMore);

    temp = temp.filter(
      (r) =>
        r.orderDate.startsWith(year + month) && // 날짜
        !r.status.includes('RETURN') && // 반품 제외
        !r.status.includes('CANCEL'), // 취소 제외
    );

    // 엑셀에 넣을 수 있게 변환
    const rows = temp.map((r) => [
      r.orderId,
      r.orderDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3'),
      r.title,
      r.totalProductPrice,
      // r.status,
      `=IMAGE("${r.imagePath}")`,
    ]);

    //  console.log(rows)

    if (rows.length > 0) {
      const row = listSheet.getLastRow() + 1;
      const column = 1;
      const numRows = rows.length;
      const numCols = rows[0].length;

      listSheet.getRange(row, column, numRows, numCols).setValues(rows);
    }
    //  SpreadsheetApp.getUi().alert('page:'+page+' hasMore:'+hasMore);
    if (!hasMore) break;
  }

  SpreadsheetApp.getUi().alert('완료!');
}
