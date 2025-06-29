import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, useSubmit } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Card,
  EmptyState,
  Layout,
  Page,
  IndexTable,
  Thumbnail,
  Text,
  InlineStack,
  Button,
  Pagination,
} from "@shopify/polaris";
import { ImageIcon } from "@shopify/polaris-icons";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const direction = url.searchParams.get("direction") || "next";

  let paginationArgs = "first: 10";
  if (cursor && direction === "next") {
    paginationArgs = `first: 10, after: "${cursor}"`;
  } else if (cursor && direction === "previous") {
    paginationArgs = `last: 10, before: "${cursor}"`;
  }

  const response = await admin.graphql(`
    {
      products(${paginationArgs}) {
        nodes {
          id
          title
          description
          handle
          status
          createdAt
          updatedAt
          images(first: 1) {
            nodes {
              url
              altText
            }
          }
          variants(first: 1) {
            nodes {
              price
            }
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }`);

  const {
    data: {
      products: { nodes, pageInfo },
    },
  } = await response.json();

  return json({
    products: nodes,
    pageInfo,
  });
}

const EmptyProductsState = () => (
  <EmptyState
    heading="No products found"
    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
  >
    <p>Create products in your Shopify admin to see them here.</p>
  </EmptyState>
);

function truncate(str, { length = 25 } = {}) {
  if (!str) return "";
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

const ProductsTable = ({ products }) => (
  <IndexTable
    resourceName={{
      singular: "product",
      plural: "products",
    }}
    itemCount={products.length}
    headings={[
      { title: "Image", hidden: true },
      { title: "Title" },
      { title: "Status" },
      { title: "Price" },
      { title: "Created" },
    ]}
    selectable={false}
  >
    {products.map((product) => (
      <ProductTableRow key={product.id} product={product} />
    ))}
  </IndexTable>
);

const ProductTableRow = ({ product }) => {
  const image = product.images?.nodes?.[0];
  const price = product.variants?.nodes?.[0]?.price;

  return (
    <IndexTable.Row id={product.id} position={product.id}>
      <IndexTable.Cell>
        <Thumbnail
          source={image?.url || ImageIcon}
          alt={image?.altText || product.title}
          size="small"
        />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="semibold" as="span">
          {truncate(product.title)}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text
          as="span"
          tone={product.status === "ACTIVE" ? "success" : "subdued"}
        >
          {product.status}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {price ? `$${price}` : "No price"}
      </IndexTable.Cell>
      <IndexTable.Cell>
        {new Date(product.createdAt).toDateString()}
      </IndexTable.Cell>
    </IndexTable.Row>
  );
};

const ProductsPagination = ({ pageInfo }) => {
  const [searchParams] = useSearchParams();
  const submit = useSubmit();

  const handlePrevious = () => {
    const params = new URLSearchParams(searchParams);
    params.set("cursor", pageInfo.startCursor);
    params.set("direction", "previous");
    submit(params, { method: "get" });
  };

  const handleNext = () => {
    const params = new URLSearchParams(searchParams);
    params.set("cursor", pageInfo.endCursor);
    params.set("direction", "next");
    submit(params, { method: "get" });
  };

  if (!pageInfo.hasNextPage && !pageInfo.hasPreviousPage) {
    return null;
  }

  return (
    <InlineStack align="center">
      <Pagination
        hasPrevious={pageInfo.hasPreviousPage}
        onPrevious={handlePrevious}
        hasNext={pageInfo.hasNextPage}
        onNext={handleNext}
      />
    </InlineStack>
  );
};

export default function Products() {
  const { products, pageInfo } = useLoaderData();

  return (
    <Page>
      <ui-title-bar title="Products">
      </ui-title-bar>
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {products.length === 0 ? (
              <EmptyProductsState />
            ) : (
              <>
                <ProductsTable products={products} />
                <div style={{ padding: "16px", borderTop: "1px solid var(--p-border-subdued)" }}>
                  <ProductsPagination pageInfo={pageInfo} />
                </div>
              </>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
