# CTEX Converter v0.8c

A browser-based, local-only converter and previewer for PNG, JPEG, and Godot CTEX images, with batch conversion for up to 20 images.

Languages: English · 한국어 · 简体中文 · 繁體中文 · 日本語 · Русский

[Open CTEX Converter](https://copy-tt.github.io/CTEX-Converter/)

## English

### Supported formats

| Format | Open | Export |
| --- | :---: | :---: |
| PNG (`.png`) | Yes | Yes |
| JPEG (`.jpg`, `.jpeg`, `.jpe`, `.jfif`) | Yes | JPG |
| Godot CTEX (`.ctex`) | Yes | Yes |

Any supported input can be exported as PNG, JPG, or a newly generated CTEX image.

### Key features

- Open up to 20 images at once with dedicated buttons or drag and drop. Opening a new set replaces the current work.
- Browse multiple images in an ordered, responsive grid. Two images use a direction-aware layout. Larger sets use `2×2` for 3–4 images, `2×3` for 5–6, `3×3` for 7–9, `3×4` for 10–12, `4×4` for 13–16, and `4×5` for 17–20. Mobile layouts use at most 2 columns. The border identifies the current image, while checkboxes choose which images to export. Double-click a thumbnail or select **View larger** for a full preview.
- View each image's name, format, size, resolution, identifiable color model and Bit Depth, plus valid JPEG DPI metadata when available.
- Rotate left, rotate right or 180°, and flip horizontally or vertically. Edits are stored separately for each image and included in its exported result.
- Zoom a large preview in 10-percentage-point steps or automatically shrink large images to stay within the preview area. Preview zoom never changes exported images or their resolution.
- Export one checked image directly. Two or more checked images are placed in an uncompressed ZIP named with the local date and time, such as `2026-07-18_17-21-13.zip`.
- Continue a batch when an individual conversion fails, and show progress plus final success and failure counts in the status area.
- Export JPG at the browser encoder's maximum quality setting (100%). JPEG remains a lossy format, so this setting does not guarantee lossless output.
- Fill transparent areas for JPG export with a White, Gray, Black, or Custom background selected through RGB, HEX, or the browser color palette. This setting does not affect PNG or CTEX exports.
- Switch between Light and Dark themes. The selected theme and interface language are remembered in local browser storage.

### Basic usage

1. Select **Open PNG**, **Open JPG**, or **Open CTEX**, or drag up to 20 supported images into the preview area.
2. In the thumbnail list, select an image to inspect or edit it. Use each checkbox to include or exclude that image from export, and use **Select all** or **Deselect all** when needed.
3. Double-click an image or select **View larger** to use the full preview and zoom controls. Rotation and flip edits affect export; zoom does not.
4. For JPG export, select the color used to fill transparent areas.
5. Select **Export PNG**, **Export JPG**, or **Export CTEX**. One checked image is downloaded directly; multiple checked images are downloaded as one uncompressed ZIP.

If the browser allows the native save-file picker in the current context, you can choose a file name and location. Otherwise, CTEX Converter uses the browser's normal download behavior.

**Reset** removes all opened images and their edit state. It also returns the visible zoom value to 100%, but does not reset the selected language, theme, JPG background, or Auto-shrink large images setting. **Restore** returns only the current image's rotation and flip edits to their original state.

### Privacy and compatibility

- Images are processed locally in your browser and are not uploaded to this project's server.
- A current Chromium-based browser is recommended for the most complete save-file experience.
- Browser capabilities and the page's security context determine whether the native save-file picker is available.
- Verify generated CTEX images in the target Godot project before production use, particularly when import settings differ.

## 한국어

### 지원 형식

| 형식 | 열기 | 내보내기 |
| --- | :---: | :---: |
| PNG (`.png`) | 지원 | 지원 |
| JPEG (`.jpg`, `.jpeg`, `.jpe`, `.jfif`) | 지원 | JPG |
| Godot CTEX (`.ctex`) | 지원 | 지원 |

지원되는 입력 이미지는 모두 PNG, JPG 또는 새로 생성한 CTEX 이미지로 내보낼 수 있습니다.

### 주요 기능

- 전용 버튼이나 드래그 앤드 드롭으로 이미지를 한 번에 최대 20개까지 열 수 있습니다. 새로운 이미지들을 열면 기존 작업은 교체됩니다.
- 여러 이미지를 순서를 유지하는 반응형 격자 목록에서 확인할 수 있습니다. 두 장일 때는 이미지 방향에 맞춘 전용 배치를 사용합니다. 3~4장은 `2×2`, 5~6장은 `2×3`, 7~9장은 `3×3`, 10~12장은 `3×4`, 13~16장은 `4×4`, 17~20장은 `4×5` 격자를 사용하며 모바일에서는 최대 2열로 표시됩니다. 테두리는 현재 이미지를 나타내며 체크박스로 내보낼 이미지를 정합니다. 썸네일을 더블 클릭하거나 **크게 보기**를 선택하면 큰 미리보기를 열 수 있습니다.
- 각 이미지의 이름, 형식, 크기, 해상도, 판별 가능한 색상 구조와 Bit Depth를 표시하며, 유효한 JPEG DPI 메타데이터가 있으면 함께 보여 줍니다.
- 이미지를 왼쪽·오른쪽·180°로 회전하거나 좌우·상하로 반전할 수 있습니다. 편집 상태는 이미지마다 별도로 보존되며 내보내는 결과에 반영됩니다.
- 큰 미리보기 배율을 10%p씩 조절하거나 큰 이미지가 미리보기 영역을 벗어나지 않도록 자동으로 축소할 수 있습니다. 미리보기 확대·축소는 내보내는 이미지와 해상도에 영향을 주지 않습니다.
- 체크된 이미지가 하나면 직접 내보내고, 두 개 이상이면 `2026-07-18_17-21-13.zip`과 같이 현지 날짜와 시간으로 이름을 정한 무압축 ZIP에 담아 내보냅니다.
- 일부 이미지의 변환이 실패해도 나머지 작업을 계속하며, 우측 상단에서 진행률과 최종 성공·실패 개수를 확인할 수 있습니다.
- JPG는 브라우저 인코더의 최대 품질 설정(100%)으로 내보냅니다. JPEG 자체는 손실 압축 형식이므로 이 설정이 무손실 결과를 보장하지는 않습니다.
- JPG 내보내기 시 투명 영역을 흰색, 회색, 검정색 또는 사용자 지정 배경색으로 채울 수 있습니다. 사용자 지정 색상은 RGB, HEX 또는 브라우저 색상 팔레트로 선택하며 PNG·CTEX 내보내기에는 적용되지 않습니다.
- 라이트·다크 테마를 전환할 수 있으며, 선택한 테마와 인터페이스 언어는 브라우저 로컬 저장소에 기억됩니다.

### 기본 사용법

1. **PNG 열기**, **JPG 열기**, **CTEX 열기** 중 하나를 선택하거나 지원되는 이미지를 미리보기 영역에 최대 20개까지 끌어다 놓습니다.
2. 썸네일 목록에서 확인하거나 편집할 이미지를 선택합니다. 각 체크박스로 내보내기 포함 여부를 정하고 필요하면 **전체 선택** 또는 **전체 해제**를 사용합니다.
3. 이미지를 더블 클릭하거나 **크게 보기**를 선택하여 큰 미리보기와 확대·축소 기능을 사용합니다. 회전과 반전은 내보내기에 반영되지만 확대·축소는 반영되지 않습니다.
4. JPG로 내보낼 때는 투명 영역을 채울 색상을 선택합니다.
5. **PNG 내보내기**, **JPG 내보내기**, **CTEX 내보내기** 중 하나를 선택합니다. 체크된 이미지가 하나면 직접 다운로드하고, 여러 개면 하나의 무압축 ZIP으로 다운로드합니다.

현재 실행 환경에서 브라우저의 파일 저장 창을 사용할 수 있으면 파일 이름과 저장 위치를 선택할 수 있습니다. 사용할 수 없는 환경에서는 브라우저의 일반 다운로드 방식으로 저장됩니다.

**초기화**는 열린 모든 이미지와 편집 상태를 제거하고 화면의 확대·축소 배율을 100%로 되돌립니다. 선택한 언어, 테마, JPG 배경색 및 큰 이미지 자동 축소 설정은 초기화하지 않습니다. **원래대로**는 현재 이미지의 회전과 반전만 원본 상태로 되돌립니다.

### 개인정보 및 호환성

- 이미지는 사용자의 브라우저에서 로컬로 처리되며 이 프로젝트의 서버로 업로드되지 않습니다.
- 파일 저장 기능을 가장 완전하게 사용하려면 최신 Chromium 기반 브라우저를 권장합니다.
- 브라우저 기능과 페이지의 보안 실행 환경에 따라 파일 저장 창의 사용 가능 여부가 달라집니다.
- 특히 가져오기 설정이 다른 경우, 실제 사용 전에 생성한 CTEX 이미지를 대상 Godot 프로젝트에서 확인하시기 바랍니다.

## Like the project? / 마음에 드셨다면

- ☕ [Support on Ko-fi / Ko-fi에서 후원하기](https://ko-fi.com/copy_tt)
- 🛠 Creator / 제작자: [Copy_TT](https://github.com/Copy-TT)
