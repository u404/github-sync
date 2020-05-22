#! /usr/bin/env node

const co = require("co")
const fs = require("fs-extra")

const axios = require("axios")
const spawn = require("cross-spawn")
const chalk = require("chalk")

const inquirer = require('inquirer')
const path = require("path")

const qs = require("qs")

const opn = require("opn")

const configs = require("./configs")

co(function* () {

  const token = "5d8d97a6820a927bde20221cfd5c5be794925eb4"

  const cwd = process.cwd()

  const projectName = path.basename(cwd)

  const public = process.argv[2]

  console.log("获取到项目名称：" + chalk.green(projectName))

  const tempCwd = path.join(path.dirname(cwd), `${projectName}__temp`)

  const spawnOpt_project = {
    cwd: tempCwd
  }

  fs.copySync(cwd, tempCwd, { 
    filter(src) { 
      const srcName = path.basename(src)
      const isCopy = srcName !== ".git" && srcName !== "node_modules"
      // isCopy && src !== cwd && console.log("正在复制文件：", src)
      return isCopy
    } 
  })

  console.log("已将项目拷贝到临时目录：" + chalk.green(tempCwd))

  let reposExist = yield axios.get(`https://api.github.com/repos/u404/${projectName}`, {
    headers: {
      'Authorization': 'token ' + token
    }
  }).then(res => true).catch(err => {
    if(err && err.response && err.response.status === 404) {
      return false
    }
    console.log(err)
    return Promise.reject({ message: "查询仓库失败" })
  })

  if(reposExist) {
    const answers = yield inquirer.prompt([{
      type: 'confirm',
      name: 'apply',
      message: `检测到同名仓库已存在，是否删除并重新同步?`,
      default: true
    }])

    if(answers.apply) {
      let delRes = yield axios.delete(`https://api.github.com/repos/u404/${projectName}`, {
        headers: {
          'Authorization': 'token ' + token
        }
      })
    } else {
      return Promise.reject({ message: "已取消项目推送" })
    }
  }

  let res = yield axios.post('https://api.github.com/user/repos', {
    name: projectName,
    private: !public
  }, {
    headers: {
      'Authorization': 'token ' + token
    }
  })

  console.log(`已创建仓库：${chalk.green(projectName)}`)
  console.log(`仓库地址：${chalk.green(res.data.ssh_url)}`)

  spawn.sync('git', ['init'], spawnOpt_project)
  spawn.sync('git', ['add', '.'], spawnOpt_project)
  spawn.sync('git', ['commit', '-am', 'init'], spawnOpt_project)
  spawn.sync('git', ['remote', 'add', 'origin', res.data.ssh_url], spawnOpt_project)
  spawn.sync('git', ['push', '-u', 'origin', 'master'], spawnOpt_project)

  fs.removeSync(tempCwd)
  console.log(`已删除临时目录：${chalk.green(tempCwd)}`)

  opn(res.data.html_url)

}).then(() => {
  console.log("项目推送成功")
}).catch(err => {
  console.log(chalk.red(err && err.message || "发生错误，推送已取消"))
})






