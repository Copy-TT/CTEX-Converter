# CTEX Converter v0.8.2

A browser-based, local-only image previewer and batch converter for PNG, JPEG, BMP, and Godot CTEX files.

Languages: English · 한국어 · 简体中文 · 繁體中文 · 日本語 · Русский

[Open CTEX Converter](https://copy-tt.github.io/CTEX-Converter/)

## English

### Supported formats

| Format | Extensions | Open | Export |
| --- | --- | :---: | :---: |
| PNG | `.png` | Yes | Yes |
| JPEG / JFIF | `.jpg`, `.jpeg`, `.jpe`, `.jfif`, `.jif`, `.jfi`, `.pjpeg`, `.pjp` | Yes | JPG |
| BMP | `.bmp` | Yes | 32-bit RGBA BMP |
| Godot CTEX | `.ctex` | Yes | Yes |

Any supported input can be exported as PNG, JPG, BMP, or a newly generated CTEX image. File contents are identified and validated by their binary signature instead of trusting only the extension or MIME type.

### Key features

- **Batch conversion** — Open up to 20 images with the format buttons or drag and drop. Mixed supported formats can be dropped together, and opening a new set replaces the current work.
- **Adaptive gallery** — Equal-sized square cards keep images in their original order. The number of rows and columns adjusts to the preview area to reduce scrolling. A border identifies the current image, while checkboxes choose which images to export.
- **Detailed image information** — View the name, detected format, file size, pixel resolution, identifiable color model, and Bit Depth. Valid JPEG or BMP DPI metadata is also shown when available. JPEG information distinguishes identifiable JFIF, Progressive, CMYK, and YCCK variants.
- **Per-image editing** — Rotate left, right, or 180°, and flip horizontally or vertically. Every image keeps its own edit state, and those edits are applied to its exported result.
- **Preview controls** — Open a large preview, adjust zoom in 10-percentage-point steps, or automatically shrink a large image to fit. Preview zoom never changes the exported pixels or resolution.
- **Flexible export** — Download one checked image directly. Two or more checked images are converted in order and placed in an uncompressed, timestamped ZIP. If one image fails, the remaining conversions continue and the status area reports the result.
- **JPG background controls** — JPG uses the browser encoder's maximum quality setting (100%). Transparent areas can be filled with White, Gray, Black, or a custom color chosen through RGB, HEX, or the browser color palette. JPEG remains a lossy format; the background setting does not affect PNG, BMP, or CTEX exports.
- **32-bit BMP export** — BMP files are generated with a BITMAPV5HEADER and BGRA pixel data so the edited image and alpha channel can be preserved.
- **Safer processing** — Dimensions, total batch pixels, output size, and archive limits are checked before expensive decoding or export work. Oversized images are rejected with a clear status message rather than being processed without a limit.
- **Personal settings** — Switch between Light and Dark themes. The selected theme and interface language are remembered in local browser storage and applied as the page opens.

### Basic usage

1. Select **Open PNG**, **Open JPG**, **Open BMP**, or **Open CTEX**. You can also drag up to 20 supported images into the preview area.
2. In the gallery, select an image to inspect or edit it. Use each checkbox to include or exclude it from export, and use **Select all** or **Deselect all** when needed.
3. Double-click a card or select **View larger** to open the large preview. Rotation and flip edits affect exported files; preview zoom does not.
4. Before JPG export, choose the color used to fill transparent areas.
5. Select **Export PNG**, **Export JPG**, **Export BMP**, or **Export CTEX**. One checked image is downloaded directly; multiple checked images are downloaded in one uncompressed ZIP.

If the browser allows its native save-file picker in the current security context, you can choose a file name and location. Otherwise, CTEX Converter falls back to the browser's normal download behavior.

**Reset** removes all opened images and their edit state and returns the visible zoom value to 100%. It does not reset the selected language, theme, JPG background, or Auto-shrink large images setting. **Restore** affects only the current image's rotation and flip edits.

### Privacy and compatibility

- Images are processed locally in your browser and are not uploaded to this project's server.
- A current Chromium-based browser is recommended for the most complete file-decoding and save-file experience.
- Native save-file picker availability depends on browser support, user-agent policy, and the page's security context.
- BMP export uses a modern 32-bit RGBA BMP V5 structure. Applications with limited or older BMP support may display its alpha channel differently.
- JPEG export uses the browser's JPEG encoder at its maximum quality setting, but JPEG is still a lossy format and cannot guarantee a mathematically lossless result.
- Verify generated CTEX images in the target Godot project before production use, particularly when project import settings differ.

## 한국어

### 지원 형식

| 형식 | 확장자 | 열기 | 내보내기 |
| --- | --- | :---: | :---: |
| PNG | `.png` | 지원 | 지원 |
| JPEG / JFIF | `.jpg`, `.jpeg`, `.jpe`, `.jfif`, `.jif`, `.jfi`, `.pjpeg`, `.pjp` | 지원 | JPG |
| BMP | `.bmp` | 지원 | 32-bit RGBA BMP |
| Godot CTEX | `.ctex` | 지원 | 지원 |

지원되는 입력 이미지는 모두 PNG, JPG, BMP 또는 새로 생성한 CTEX 이미지로 내보낼 수 있습니다. 파일 형식은 확장자나 MIME 형식만 신뢰하지 않고 실제 바이너리 시그니처를 확인하여 판별합니다.

### 주요 기능

- **다중 이미지 변환** — 형식별 열기 버튼이나 드래그 앤드 드롭으로 이미지를 한 번에 최대 20개까지 열 수 있습니다. 서로 다른 지원 형식도 함께 끌어다 놓을 수 있으며, 새로운 이미지들을 열면 기존 작업은 교체됩니다.
- **자동 갤러리** — 이미지를 원래 순서대로 동일한 크기의 정사각형 카드에 표시합니다. 스크롤을 줄이도록 미리보기 영역에 맞춰 행과 열을 조절합니다. 테두리는 현재 이미지를, 체크박스는 내보낼 이미지를 나타냅니다.
- **상세 이미지 정보** — 이름, 감지된 형식, 파일 크기, 픽셀 해상도, 판별 가능한 색상 구조와 Bit Depth를 표시합니다. 유효한 JPEG 또는 BMP DPI 메타데이터가 있으면 함께 표시하며, JPEG는 판별 가능한 JFIF, Progressive, CMYK, YCCK 형식도 구분합니다.
- **개별 이미지 편집** — 이미지를 왼쪽·오른쪽·180°로 회전하거나 좌우·상하로 반전할 수 있습니다. 각 이미지의 편집 상태는 별도로 보존되며 내보내는 결과에 반영됩니다.
- **미리보기 조절** — 큰 미리보기를 열고 배율을 10%p씩 조절하거나, 큰 이미지를 미리보기 영역에 맞게 자동으로 축소할 수 있습니다. 미리보기 확대·축소는 내보내는 픽셀이나 해상도에 영향을 주지 않습니다.
- **유연한 내보내기** — 체크된 이미지 하나는 직접 다운로드합니다. 두 개 이상은 순서대로 변환하여 날짜와 시간을 이름으로 사용한 무압축 ZIP에 담습니다. 일부 이미지의 변환이 실패해도 나머지 작업은 계속되며 상태 영역에서 결과를 확인할 수 있습니다.
- **JPG 배경색 설정** — JPG는 브라우저 인코더의 최대 품질 설정(100%)으로 내보냅니다. 투명 영역을 흰색, 회색, 검정색 또는 RGB·HEX·브라우저 색상 팔레트로 지정한 사용자 색상으로 채울 수 있습니다. JPEG는 손실 압축 형식이며 이 배경색은 PNG·BMP·CTEX 내보내기에 적용되지 않습니다.
- **32-bit BMP 내보내기** — 편집한 이미지와 알파 채널을 보존할 수 있도록 BITMAPV5HEADER와 BGRA 픽셀 데이터로 BMP 파일을 생성합니다.
- **안전한 처리 제한** — 큰 디코딩이나 내보내기를 시작하기 전에 이미지 크기, 전체 픽셀 수, 출력 크기 및 ZIP 한계를 확인합니다. 지나치게 큰 이미지는 제한 없이 처리하지 않고 명확한 상태 문구와 함께 제외합니다.
- **개인 설정** — 라이트·다크 테마를 전환할 수 있습니다. 선택한 테마와 인터페이스 언어는 브라우저 로컬 저장소에 기억되며 페이지를 열 때부터 적용됩니다.

### 기본 사용법

1. **PNG 열기**, **JPG 열기**, **BMP 열기**, **CTEX 열기** 중 하나를 선택합니다. 지원되는 이미지를 미리보기 영역에 최대 20개까지 끌어다 놓을 수도 있습니다.
2. 갤러리에서 확인하거나 편집할 이미지를 선택합니다. 각 체크박스로 내보내기 포함 여부를 정하고 필요하면 **전체 선택** 또는 **전체 해제**를 사용합니다.
3. 카드를 더블 클릭하거나 **크게 보기**를 선택하여 큰 미리보기를 엽니다. 회전과 반전은 내보내는 파일에 반영되지만 미리보기 확대·축소는 반영되지 않습니다.
4. JPG로 내보내기 전에는 투명 영역을 채울 색상을 선택합니다.
5. **PNG 내보내기**, **JPG 내보내기**, **BMP 내보내기**, **CTEX 내보내기** 중 하나를 선택합니다. 체크된 이미지가 하나면 직접 다운로드하고, 여러 개면 하나의 무압축 ZIP으로 다운로드합니다.

현재 보안 실행 환경에서 브라우저의 파일 저장 창을 사용할 수 있으면 파일 이름과 저장 위치를 선택할 수 있습니다. 사용할 수 없으면 브라우저의 일반 다운로드 방식으로 자동 전환됩니다.

**초기화**는 열린 모든 이미지와 편집 상태를 제거하고 화면의 확대·축소 배율을 100%로 되돌립니다. 선택한 언어, 테마, JPG 배경색 및 큰 이미지 자동 축소 설정은 초기화하지 않습니다. **원래대로**는 현재 이미지의 회전과 반전만 원본 상태로 되돌립니다.

### 개인정보 및 호환성

- 이미지는 사용자의 브라우저에서 로컬로 처리되며 이 프로젝트의 서버로 업로드되지 않습니다.
- 파일 디코딩과 저장 기능을 가장 완전하게 사용하려면 최신 Chromium 기반 브라우저를 권장합니다.
- 파일 저장 창의 사용 가능 여부는 브라우저 지원, 사용자 에이전트 정책 및 페이지의 보안 실행 환경에 따라 달라집니다.
- BMP는 최신 32-bit RGBA BMP V5 구조로 내보냅니다. BMP 지원이 제한적이거나 오래된 프로그램에서는 알파 채널이 다르게 표시될 수 있습니다.
- JPG는 브라우저의 JPEG 인코더를 최대 품질로 사용하지만 JPEG 자체가 손실 압축 형식이므로 수학적으로 무손실인 결과를 보장하지 않습니다.
- 특히 가져오기 설정이 다른 경우, 실제 사용 전에 생성한 CTEX 이미지를 대상 Godot 프로젝트에서 확인하시기 바랍니다.

## Like the project? / 마음에 드셨다면

- ☕ [Support on Ko-fi / Ko-fi에서 후원하기](https://ko-fi.com/copy_tt)
- 🛠 Creator / 제작자: [Copy_TT](https://github.com/Copy-TT)
