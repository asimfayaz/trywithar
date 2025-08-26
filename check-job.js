const { supabaseServer } = require('./lib/supabase-server.ts');

(async () => {
  const { data, error } = await supabaseServer
    .from('jobs')
    .select('*')
    .eq('external_job_id', 'ay6rtf44knrj40crv29bjt1aww');

  if (error) {
    console.error('Error fetching job:', error);
    return;
  }

  console.log('Job data:', data);
})();
