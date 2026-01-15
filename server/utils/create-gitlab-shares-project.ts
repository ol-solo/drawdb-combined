import axios from 'axios';

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '');
}

async function main() {
  const baseUrl = process.env.GITLAB_BASE_URL || '';
  const token = process.env.GITLAB_TOKEN || '';
  const namespaceId = process.env.GITLAB_NAMESPACE_ID; // optional (group/user namespace id)

  if (!baseUrl || !token) {
    throw new Error('Missing GITLAB_BASE_URL or GITLAB_TOKEN');
  }

  const apiBase = `${normalizeBaseUrl(baseUrl)}/api/v4`;
  const name = process.env.GITLAB_SHARES_PROJECT_NAME || 'drawdb-shares';
  const visibility = process.env.GITLAB_SHARES_PROJECT_VISIBILITY || 'private';

  const { data } = await axios.post(
    `${apiBase}/projects`,
    {
      name,
      visibility,
      ...(namespaceId ? { namespace_id: Number(namespaceId) } : {}),
      initialize_with_readme: true,
    },
    { headers: { 'PRIVATE-TOKEN': token } },
  );

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        project_id: data.id,
        path_with_namespace: data.path_with_namespace,
        default_branch: data.default_branch,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e?.response?.data || e);
  process.exit(1);
});

