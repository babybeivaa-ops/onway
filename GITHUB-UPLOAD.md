# GitHub에 올리는 순서

1. ONWAY-GitHub.zip의 압축을 풉니다.
2. GitHub에서 새 저장소를 만듭니다. 이름은 onway로 하고 공개 범위는 Private(비공개)로 선택합니다. README·라이선스·gitignore 자동 추가는 하지 않아도 됩니다. README와 gitignore는 이 압축에 있습니다.
3. 빈 저장소 화면의 uploading an existing file 링크, 또는 Add file → Upload files를 선택합니다.
4. 압축을 푼 폴더 **안의 파일과 폴더 전체**를 업로드 영역으로 끌어 놓습니다. ZIP 자체를 올리지 말고 src/ 등 폴더 구조를 유지하세요.
5. Commit changes로 저장합니다.
6. 저장소 첫 화면에 package.json, README.md, src/, public/, scripts/, tests/가 바로 보이는지 확인합니다. 상위 폴더 하나 안에 전부 들어가지 않도록 합니다. .gitignore도 포함하세요.

이 작업은 코드 보관입니다. 사이트 배포와 기기 간 기록 공유는 별도 단계입니다.
node_modules, dist, 임시 화면 이미지, .env, 브라우저 저장 기록은 이 압축에 포함하지 않았습니다.

공식 안내: https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
