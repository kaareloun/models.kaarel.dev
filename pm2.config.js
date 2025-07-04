module.exports = {
  name: "models.kaarel.dev",
  script: "bun",
  args: "run start",
  interpreter: "bun",
  env: {
    PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}`,
    PORT: 3001,
  },
};
