#! /usr/bin/env node

const co = require("co")
const fs = require("fs-extra")

const axios = require("axios")
const spawn = require("cross-spawn")
const chalk = require("chalk")

const inquirer = require('inquirer')

const qs = require("qs")

const opn = require("opn")

const configs = require("./configs")



co(function* () {
  const token = "5d8d97a6820a927bde20221cfd5c5be794925eb4"

  const projectName = process.argv[2]

  const namespace = process.argv[3] || 'node'

  const gitSource = configs.specialSources[projectName] || (/\.git$/.test(namespace) && namespace) || null

  console.log("获取到项目名称：" + chalk.green(projectName))

  // fs.ensureDirSync(projectName)

  // console.log("创建项目目录：" + chalk.green(projectName))

  const projectCwd = process.cwd() + "\\" + projectName

  // console.log("获取项目目录的上下文：" + projectCwd)

  const spawnOpt = {
    cwd: process.cwd()
  }

  const spawnOpt_project = {
    cwd: projectCwd
  }

  fs.removeSync(projectName)

  spawn.sync('git', ['clone', gitSource || `git@t-gitlab.smartcinema.com.cn:${namespace}/${projectName}.git`], spawnOpt)
  spawn.sync('git', ['checkout', 'master'], spawnOpt_project)

  fs.removeSync(`${projectName}/.git`)

  let reposExist = yield axios.get(`https://api.github.com/repos/u404/${projectName}`, {
    headers: {
      'Authorization': 'token ' + token
    }
  }).then(res => true).catch(err => {
    if(err && err.response && err.response.status === 404) {
      return false
    }
    console.log(err)
    return Promise.reject("查询仓库失败")
  })

  if(reposExist) {
    // yield axios.post() // 删除仓库
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
    private: true
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

  opn(res.data.html_url)

}).then(() => {
  console.log("项目推送成功")
}).catch(err => {
  console.log(err)
  console.log(chalk.red(err && err.message || "发生错误，推送已取消"))
})






