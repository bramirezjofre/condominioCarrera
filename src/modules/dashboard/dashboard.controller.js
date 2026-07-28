export async function showDashboard(req, res) {
  const user = req.session.user;
  res.render('dashboard/index', {
    title: 'Panel principal',
    user
  });
}