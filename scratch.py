import pyhwpx
hwpx = pyhwpx.Hwp()
hwpx.open(r'D:\100 shop\ModooRoom\docs\OpenAPI활용가이드-_건축HUB_건축물대장_1.0.hwp', hidden=True)
print(hwpx.get_text())
hwpx.quit()
