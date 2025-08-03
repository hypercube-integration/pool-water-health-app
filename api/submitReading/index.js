module.exports = async function (context, req) {
  const reading = req.body;

  context.res = {
    status: 200,
    body: {
      message: "Reading received successfully",
      data: reading
    }
  };
};