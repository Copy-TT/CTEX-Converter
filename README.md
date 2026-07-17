# CTEX Converter

**Current version: v0.7.6**

[Open CTEX Converter](https://copy-tt.github.io/CTEX-Converter/)

CTEX Converter is a browser-based image viewer and converter for PNG, JPEG, and supported Godot CTEX texture files. It runs on GitHub Pages without installation, and selected files are processed locally on your device.

## Features

- Open PNG images and JPEG images with `.jpg`, `.jpeg`, `.jpe`, and `.jfif` extensions
- Open supported Godot CTEX texture files
- Drag and drop a supported file into the Preview area
- Preview transparent images on a checkerboard background
- Display the file name, format, size, and resolution
- Show the original color model and Bit Depth in Format, and valid JPG DPI metadata in Resolution
- Automatically format file sizes in B, KB, MB, or GB
- Export any opened image as PNG, JPG, or a newly generated CTEX file
- Rotate left, rotate right, rotate 180°, flip horizontally, flip vertically, or reset all rotation and flip changes
- Zoom the Preview in or out by 10 percentage points, reset it to 100%, or automatically fit it to the available space
- Choose a White, Gray, Black, or Custom JPG background color
- Enter a Custom JPG background color with RGB or HEX values
- Open the browser color palette by selecting the JPG color preview
- View contextual help for JPG Background, Edit, and Zoom
- Switch between Light Mode and Dark Mode
- Use the interface in English, Korean, Simplified Chinese, Traditional Chinese, Japanese, or Russian
- Clear the current file without reloading the page

Rotation and flip changes are included in exported files. Preview zoom changes only the on-screen display and do not change the exported resolution.

## Supported input and output

| Format | Open | Export | Notes |
| --- | :---: | :---: | --- |
| PNG | Yes | Yes | Transparency is preserved when possible. |
| JPG / JPEG / JPE / JFIF | Yes | Yes | JPG export requests 100% quality from the browser encoder. |
| CTEX | Yes | Yes | Export creates a new CTEX file from the current image. |

Any supported input can be exported to any supported output. For example, a JPG can be exported as CTEX, and a CTEX can be exported as JPG.

## How to use it

1. Select **Open PNG**, **Open JPG**, or **Open CTEX**. You can also drop a supported file into the Preview area.
2. Check the image and its Name, Format, Size, and Resolution. Format includes the source color model and Bit Depth when they can be identified. Resolution includes DPI only when valid JPG EXIF or JFIF density metadata is available.
3. If needed, rotate or flip the image. Use **180°** for a half turn or **Reset** to clear all rotation and flip changes.
4. Adjust the Preview with the `−`, `100%`, and `+` controls. Each `−` or `+` action changes the zoom by 10 percentage points. With **Auto-fit Preview** enabled, the Preview is recalculated when the image or browser window changes. When it is disabled, the Preview returns to and remains at 100% until you change it manually.
5. When exporting JPG, choose a background preset, enter a Custom RGB or HEX color, or select the color preview to open the browser color palette. JPG does not support transparency, so transparent pixels are composited onto the selected background color.
6. Select **Export PNG**, **Export JPG**, or **Export CTEX**.

On browsers that support the native save-file picker in the current context, you can choose the file name and save location. Otherwise, the browser uses its normal download behavior.

Opening another file replaces the current image and resets its rotation and flip state. **Clear File** removes the current image and its transform state. JPG background and Auto-fit Preview settings remain available for the next file.

## Language, theme, and accessibility

The language menu is ordered as follows:

1. English
2. 한국어
3. 简体中文
4. 繁體中文
5. 日本語
6. Русский

Changing the language updates interface labels, status messages, button descriptions, and accessibility labels. The selected language is remembered in browser storage.

Light Mode is the default appearance. The selected Light or Dark theme is also remembered in browser storage. These preferences use local browser storage rather than cookies.

## Privacy and compatibility

- Images are processed locally in your browser and are not uploaded to this project’s server.
- A modern Chromium-based browser is recommended for the most complete save-file experience.
- Browser support and security context can affect whether the native save-file picker is available; standard downloading is used as a fallback.
- CTEX output should be tested in the target Godot project before production use, especially when engine import settings differ.

## Creator and support

- Creator: [Copy_TT](https://github.com/Copy-TT)
- Support: [Ko-fi](https://ko-fi.com/copy_tt)

---

# CTEX Converter

**현재 버전: v0.7.6**

[CTEX Converter 열기](https://copy-tt.github.io/CTEX-Converter/)

CTEX Converter는 PNG, JPEG 및 지원되는 Godot CTEX 텍스처 파일을 브라우저에서 열고 변환할 수 있는 이미지 도구입니다. GitHub Pages에서 별도 설치 없이 실행되며, 선택한 파일은 사용자의 기기에서 로컬로 처리됩니다.

## 제공 기능

- PNG 이미지와 `.jpg`, `.jpeg`, `.jpe`, `.jfif` 확장자의 JPEG 이미지 열기
- 지원되는 Godot CTEX 텍스처 파일 열기
- 지원되는 파일을 Preview 영역으로 끌어다 놓아 열기
- 투명 이미지를 체커보드 배경에서 미리보기
- 파일 이름, 형식, 크기 및 해상도 표시
- 형식에 원본 색상 구조와 Bit Depth를 표시하고, 유효한 JPG DPI 메타데이터가 있으면 해상도에 함께 표시
- 파일 크기를 B, KB, MB 또는 GB 단위로 자동 표시
- 불러온 모든 이미지를 PNG, JPG 또는 새로 생성한 CTEX 파일로 내보내기
- 왼쪽 회전, 오른쪽 회전, 180° 회전, 좌우 반전, 상하 반전 및 모든 회전·반전 초기화
- Preview 배율을 10%p씩 확대·축소하거나 100%로 초기화하고, 사용 가능한 공간에 자동 맞춤
- JPG 배경색을 흰색, 회색, 검정색 또는 사용자 지정으로 선택
- 사용자 지정 JPG 배경색을 RGB 또는 HEX 값으로 입력
- JPG 색상 미리보기를 눌러 브라우저 색상 팔레트 열기
- JPG 배경색, 편집 및 확대·축소에 대한 상황별 도움말 확인
- 라이트 모드와 다크 모드 전환
- English, 한국어, 简体中文, 繁體中文, 日本語, Русский 인터페이스
- 페이지를 새로고침하지 않고 현재 파일 지우기

회전과 반전은 내보내는 파일에 반영됩니다. Preview 확대·축소는 화면 표시만 변경하며 내보내기 해상도에는 영향을 주지 않습니다.

## 지원 입력 및 출력

| 형식 | 열기 | 내보내기 | 설명 |
| --- | :---: | :---: | --- |
| PNG | 지원 | 지원 | 가능한 경우 투명도가 유지됩니다. |
| JPG / JPEG / JPE / JFIF | 지원 | 지원 | JPG 내보내기는 브라우저 인코더에 100% 품질을 요청합니다. |
| CTEX | 지원 | 지원 | 현재 이미지로부터 새로운 CTEX 파일을 생성합니다. |

지원되는 입력 파일은 어떤 지원 출력 형식으로도 내보낼 수 있습니다. 예를 들어 JPG를 CTEX로 내보내거나 CTEX를 JPG로 내보낼 수 있습니다.

## 사용 방법

1. **PNG 열기**, **JPG 열기**, **CTEX 열기** 중 하나를 선택합니다. 지원되는 파일을 Preview 영역으로 끌어다 놓아도 됩니다.
2. 이미지와 이름, 형식, 크기 및 해상도 정보를 확인합니다. 판별할 수 있는 경우 형식에 원본 색상 구조와 Bit Depth가 표시됩니다. 유효한 JPG EXIF 또는 JFIF 밀도 메타데이터가 있을 때만 해상도에 DPI가 함께 표시됩니다.
3. 필요하면 이미지를 회전하거나 반전합니다. **180°** 버튼으로 이미지를 반 바퀴 회전하거나 **초기화** 버튼으로 모든 회전·반전을 초기화할 수 있습니다.
4. `−`, `100%`, `+` 버튼으로 Preview 배율을 조절합니다. `−`와 `+`를 한 번 누를 때마다 배율이 10%p씩 변경됩니다. **미리보기 자동 맞춤**을 켜면 이미지 또는 브라우저 창의 크기가 바뀔 때 Preview 배율을 다시 계산합니다. 끄면 Preview가 100%로 돌아가며, 이후 직접 변경하기 전까지 100%를 유지합니다.
5. JPG로 내보낼 때는 배경색 프리셋을 고르거나 사용자 지정 RGB·HEX 색상을 입력합니다. 색상 미리보기를 누르면 브라우저 색상 팔레트를 열 수 있습니다. JPG는 투명도를 지원하지 않으므로 투명 픽셀은 선택한 배경색 위에 합성됩니다.
6. **PNG 내보내기**, **JPG 내보내기**, **CTEX 내보내기** 중 하나를 선택합니다.

현재 실행 환경에서 브라우저의 파일 저장 창을 지원하면 파일 이름과 저장 경로를 선택할 수 있습니다. 지원하지 않는 환경에서는 브라우저의 일반 다운로드 방식으로 저장됩니다.

다른 파일을 열면 현재 이미지가 교체되고 회전·반전 상태가 초기화됩니다. **파일 지우기**는 현재 이미지와 변형 상태를 제거합니다. JPG 배경색과 미리보기 자동 맞춤 설정은 다음 파일에서도 계속 사용할 수 있습니다.

## 언어, 테마 및 접근성

언어 메뉴는 다음 순서로 구성됩니다.

1. English
2. 한국어
3. 简体中文
4. 繁體中文
5. 日本語
6. Русский

언어를 변경하면 화면 문구, 상태 안내, 버튼 설명 및 접근성 문구도 함께 변경됩니다. 선택한 언어는 브라우저 저장소에 기억됩니다.

기본 화면은 라이트 모드입니다. 선택한 라이트·다크 테마 역시 브라우저 저장소에 기억됩니다. 이러한 설정에는 쿠키가 아니라 브라우저의 로컬 저장소를 사용합니다.

## 개인정보 및 호환성

- 이미지는 사용자의 브라우저에서 로컬로 처리되며 이 프로젝트의 서버로 업로드되지 않습니다.
- 파일 저장 기능을 가장 완전하게 사용하려면 최신 Chromium 기반 브라우저를 권장합니다.
- 브라우저 지원 여부와 보안 실행 환경에 따라 파일 저장 창을 사용할 수 없을 수 있으며, 이때는 일반 다운로드 방식을 사용합니다.
- 특히 엔진의 가져오기 설정이 다른 경우에는 실제 사용 전 대상 Godot 프로젝트에서 CTEX 출력 파일을 확인하는 것이 좋습니다.

## 제작자 및 후원

- 제작자: [Copy_TT](https://github.com/Copy-TT)
- 후원하기: [Ko-fi](https://ko-fi.com/copy_tt)
