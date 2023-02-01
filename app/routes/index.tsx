import { Suspense, useEffect } from 'react';
import { Await, defer, useLoaderData, useRevalidator, type LoaderFunction } from 'react-router';

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

interface DeferredData {
  one: Promise<string>,
  two: Promise<string>,
  three: Promise<string>,
}

export const loader: LoaderFunction = () => {
  return defer({
    one: wait(1000).then(() => 'First Value'),
    two: wait(2000).then(() => 'Second Value'),
    three: wait(3000).then(() => 'Third Value'),
  });
};

export default function Index() {
  const { one, two, three } = useLoaderData() as DeferredData;
  const refresh = useRevalidator();
  const loading = <div>Loading...</div>;

  // useEffect(() => {
  //   setTimeout(() => {
  //     refresh.revalidate();
  //   }, 5000);
  // }, []);

  return (
    <div>
      <h1>Each deferred value will appear below</h1>
      <Suspense fallback={loading}>
        <Await resolve={one}>{(text) => <div>{text}</div>}</Await>
      </Suspense>
      <Suspense fallback={loading}>
        <Await resolve={two}>{(text) => <div>{text}</div>}</Await>
      </Suspense>
      <Suspense fallback={loading}>
        <Await resolve={three}>{(text) => <div>{text}</div>}</Await>
      </Suspense>
    </div>
  );
}
