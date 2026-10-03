# 开发交接状态

更新日期：2026-10-03（Asia/Shanghai）。

## 本轮完成
- 读取原约定、需求与交接包，在原React/TypeScript/Three.js架构上开发，保留原三种恐龙与全部程序化素材。
- 升级奶油/苔绿界面、居民头像、桌面与小屏布局、44px目标、焦点反馈、键盘操作与特写取景窗。
- 新增中文/English持久化切换、居民特写、招呼爱心、投喂、晨光/落日和场景PNG保存。
- 修复喝水瞬间转向、单岸边目标造成部分居民从不喝水、脚掌/脚趾原地滑移、嘴部够不到水面、镜头远裁面及横竖切换比例、截图失败恢复和阴影资源释放。
- Vite 8.0.13 → 8.0.16，审计0漏洞；加入可复现Playwright验收脚本。
- 建立PROJECT.md、MEMORY.md、TASKS.md、WORKLOG.md，后续设备从文件接续工作。

## 验证
- npm ci、npm test（7组）、npm run build通过。
- Chrome154 / macOS15.7 / M1 Pro真实WebGL完成四视口交互、中英切换、触摸模拟、截图与WebGL回退；正常流程0浏览器/网络错误。
- 真实场景90秒连续运行并人工查看截图；三种喝水姿态另作受控截图。证据在docs/qa。
- 设备限制：没有实体手机，模拟手势和M1 Pro上的手机视口帧率不能当作真机达标。Three.js场景块仍有500KB体积提示。

## 发布记录
- 公开仓库：https://github.com/BreezeLife/dino-grove
- 实际Pages地址：https://breezelife.github.io/dino-grove/（GitHub Pages API返回，HTTP 200）
- 首发源码提交：0c1002e411ceb6efc6cd33bff647b825b284c158
- 首次成功构建/部署：https://github.com/BreezeLife/dino-grove/actions/runs/37080688803
- 线上390×844真实Chrome回归通过：中英切换与刷新记忆、三居民互动、镜头、模拟触摸、截图、资源加载和WebGL回退。0正常流程浏览器/网络错误。报告：qa/production/browser-report.json。
- 后续提交补充首帧负时间差保护和本发布记录；当前源码版本由仓库main及其最新成功Actions运行定位。
- 授权复用：gh负责创建仓库和Pages配置；OAuth缺workflow范围，推送改用本机已验证为BreezeLife的SSH授权，未重新登录。origin为git@github.com:BreezeLife/dino-grove.git。
- 首次push工作流在Pages启用前configure-pages返回404；启用Pages后显式触发上述成功工作流，问题已解决。
