module.exports = async function (context, req) {
  context.res = { status: 200, body: { ok: true, route: "/api/admin/users/test" } };
};
