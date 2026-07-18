# CTEX Converter v0.7.8

A browser-based, local-only converter and previewer for PNG, JPEG, and Godot CTEX files.

Languages: English · 한국어 · 简体中文 · 繁體中文 · 日本語 · Русский

[Open CTEX Converter](https://copy-tt.github.io/CTEX-Converter/)

## English

### Supported formats

| Format | Open | Export |
| --- | :---: | :---: |
| PNG (`.png`) | Yes | Yes |
| JPEG (`.jpg`, `.jpeg`, `.jpe`, `.jfif`) | Yes | JPG |
| Godot CTEX (`.ctex`) | Yes | Yes |

Any supported input can be exported as PNG, JPG, or a newly generated CTEX file.

### Key features

- Open files with dedicated buttons or drag and drop, then preview them before exporting.
- View the name, format, size, resolution, identifiable color model and Bit Depth, plus valid JPEG DPI metadata when available.
- Rotate left, rotate right or 180°, and flip horizontally or vertically. These edits are included in exported files and can be restored to the original state at once.
- Zoom the preview in 10-percentage-point steps or automatically shrink large images to stay within the preview area. Manual zoom turns off automatic shrinking, and preview zoom never changes the exported image or its resolution.
- Export JPG at the browser encoder's maximum quality setting (100%). JPEG remains a lossy format, so this setting does not guarantee lossless output.
- Fill transparent areas for JPG export with a White, Gray, Black, or Custom background selected through RGB, HEX, or the browser color palette. This setting does not affect PNG or CTEX exports.
- Switch between Light and Dark themes. The selected theme and interface language are remembered in local browser storage.

### Basic usage

1. Select **Open PNG**, **Open JPG**, or **Open CTEX**, or drop a supported file into the preview area.
2. Review the preview and file information, then apply rotation or flip edits if needed.
3. For JPG export, select the color used to fill transparent areas.
4. Select **Export PNG**, **Export JPG**, or **Export CTEX**.

If the browser allows the native save-file picker in the current context, you can choose a file name and location. Otherwise, CTEX Converter uses the browser's normal download behavior.

**Reset** removes the currently opened file and its edit state. It does not reset the selected language, theme, JPG background, or Auto-shrink large images setting. **Restore** returns only rotation and flip edits to the original image state.

### Privacy and compatibility

- Files are processed locally in your browser and are not uploaded to this project's server.
- A current Chromium-based browser is recommended for the most complete save-file experience.
- Browser capabilities and the page's security context determine whether the native save-file picker is available.
- Verify generated CTEX files in the target Godot project before production use, particularly when import settings differ.

## 한국어

### 지원 형식

| 형식 | 열기 | 내보내기 |
| --- | :---: | :---: |
| PNG (`.png`) | 지원 | 지원 |
| JPEG (`.jpg`, `.jpeg`, `.jpe`, `.jfif`) | 지원 | JPG |
| Godot CTEX (`.ctex`) | 지원 | 지원 |

지원되는 입력 파일은 모두 PNG, JPG 또는 새로 생성한 CTEX 파일로 내보낼 수 있습니다.

### 주요 기능

- 전용 버튼이나 드래그 앤드 드롭으로 파일을 열고, 내보내기 전에 이미지를 미리 확인할 수 있습니다.
- 이름, 형식, 크기, 해상도, 판별 가능한 색상 구조와 Bit Depth를 표시하며, 유효한 JPEG DPI 메타데이터가 있으면 함께 보여 줍니다.
- 이미지를 왼쪽·오른쪽·180°로 회전하거나 좌우·상하로 반전할 수 있습니다. 편집 결과는 내보내는 파일에 반영되며 한 번에 원래 상태로 되돌릴 수 있습니다.
- 미리보기 배율을 10%p씩 조절하거나 큰 이미지가 미리보기 영역을 벗어나지 않도록 자동으로 축소할 수 있습니다. 배율을 수동으로 조절하면 자동 축소가 해제되며, 미리보기 확대·축소는 내보내는 이미지와 해상도에 영향을 주지 않습니다.
- JPG는 브라우저 인코더의 최대 품질 설정(100%)으로 내보냅니다. JPEG 자체는 손실 압축 형식이므로 이 설정이 무손실 결과를 보장하지는 않습니다.
- JPG 내보내기 시 투명 영역을 흰색, 회색, 검정색 또는 사용자 지정 배경색으로 채울 수 있습니다. 사용자 지정 색상은 RGB, HEX 또는 브라우저 색상 팔레트로 선택하며 PNG·CTEX 내보내기에는 적용되지 않습니다.
- 라이트·다크 테마를 전환할 수 있으며, 선택한 테마와 인터페이스 언어는 브라우저 로컬 저장소에 기억됩니다.

### 기본 사용법

1. **PNG 열기**, **JPG 열기**, **CTEX 열기** 중 하나를 선택하거나 지원되는 파일을 미리보기 영역에 놓습니다.
2. 미리보기와 파일 정보를 확인하고 필요한 경우 이미지를 회전하거나 반전합니다.
3. JPG로 내보낼 때는 투명 영역을 채울 색상을 선택합니다.
4. **PNG 내보내기**, **JPG 내보내기**, **CTEX 내보내기** 중 하나를 선택합니다.

현재 실행 환경에서 브라우저의 파일 저장 창을 사용할 수 있으면 파일 이름과 저장 위치를 선택할 수 있습니다. 사용할 수 없는 환경에서는 브라우저의 일반 다운로드 방식으로 저장됩니다.

**초기화**는 현재 열린 파일과 편집 상태를 제거합니다. 선택한 언어, 테마, JPG 배경색 및 큰 이미지 자동 축소 설정은 초기화하지 않습니다. **원래대로**는 회전과 반전만 원본 이미지 상태로 되돌립니다.

### 개인정보 및 호환성

- 파일은 사용자의 브라우저에서 로컬로 처리되며 이 프로젝트의 서버로 업로드되지 않습니다.
- 파일 저장 기능을 가장 완전하게 사용하려면 최신 Chromium 기반 브라우저를 권장합니다.
- 브라우저 기능과 페이지의 보안 실행 환경에 따라 파일 저장 창의 사용 가능 여부가 달라집니다.
- 특히 가져오기 설정이 다른 경우, 실제 사용 전에 생성한 CTEX 파일을 대상 Godot 프로젝트에서 확인하시기 바랍니다.

## Like the project? / 마음에 드셨다면

- ☕ [Support on Ko-fi / Ko-fi에서 후원하기](https://ko-fi.com/copy_tt)
- 🛠 Creator / 제작자: [Copy_TT](https://github.com/Copy-TT)
