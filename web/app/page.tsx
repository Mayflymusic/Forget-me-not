import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createSupabaseServerActionClient,
  createSupabaseServerComponentClient,
} from "../lib/supabaseServer";

async function signOut() {
  "use server";

  const supabase = createSupabaseServerActionClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function addDevice(formData: FormData) {
  "use server";

  const name = (formData.get("name") as string)?.trim();
  const role = formData.get("role") as "sender" | "receiver";
  const providedSecret = (formData.get("secret") as string)?.trim();

  if (!role) {
    return;
  }

  const supabase = createSupabaseServerActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const secret =
    providedSecret && providedSecret.length >= 12
      ? providedSecret
      : randomUUID().replace(/-/g, "").slice(0, 24);

  await supabase.from("devices").insert({
    name: name || null,
    role,
    secret,
  });

  revalidatePath("/");
}

async function deleteDevice(formData: FormData) {
  "use server";

  const deviceId = formData.get("deviceId") as string;
  if (!deviceId) {
    return;
  }

  const supabase = createSupabaseServerActionClient();
  await supabase.from("devices").delete().eq("id", deviceId);
  revalidatePath("/");
}

async function createPair(formData: FormData) {
  "use server";

  const senderId = formData.get("senderId") as string;
  const receiverId = formData.get("receiverId") as string;

  if (!senderId || !receiverId || senderId === receiverId) {
    return;
  }

  const supabase = createSupabaseServerActionClient();

  const { data: sender } = await supabase
    .from("devices")
    .select("role")
    .eq("id", senderId)
    .maybeSingle();

  const { data: receiver } = await supabase
    .from("devices")
    .select("role")
    .eq("id", receiverId)
    .maybeSingle();

  if (sender?.role !== "sender" || receiver?.role !== "receiver") {
    return;
  }

  const existing = await supabase
    .from("pairs")
    .select("id")
    .eq("sender_id", senderId)
    .eq("receiver_id", receiverId)
    .maybeSingle();

  if (existing.data) {
    return;
  }

  await supabase.from("pairs").insert({
    sender_id: senderId,
    receiver_id: receiverId,
  });

  revalidatePath("/");
}

async function deletePair(formData: FormData) {
  "use server";

  const pairId = formData.get("pairId") as string;
  if (!pairId) {
    return;
  }

  const supabase = createSupabaseServerActionClient();
  await supabase.from("pairs").delete().eq("id", pairId);
  revalidatePath("/");
}

export default async function HomePage() {
  const supabase = createSupabaseServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const [{ data: devices }, { data: pairs }, { data: events }] =
    await Promise.all([
      supabase.from("devices").select("*").order("created_at", {
        ascending: true,
      }),
      supabase.from("pairs").select("*").order("created_at", {
        ascending: true,
      }),
      supabase
        .from("events")
        .select("*")
        .order("triggered_at", { ascending: false })
        .limit(20),
    ]);

  const deviceMap = new Map(
    (devices ?? []).map((device) => [device.id, device])
  );

  const enrichedEvents =
    events?.map((event) => {
      const pair = pairs?.find((item) => item.id === event.pair_id);
      if (!pair) {
        return {
          ...event,
          senderName: "Unknown sender",
          receiverName: "Unknown receiver",
        };
      }

      const sender = deviceMap.get(pair.sender_id);
      const receiver = deviceMap.get(pair.receiver_id);

      return {
        ...event,
        senderName: sender?.name ?? sender?.id ?? "Unassigned sender",
        receiverName:
          receiver?.name ?? receiver?.id ?? "Unassigned receiver",
      };
    }) ?? [];

  const edgeFunctionUrl =
    process.env.NEXT_PUBLIC_TOUCH_EVENT_URL ??
    "https://<project-ref>.supabase.co/functions/v1/touch-event";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-400/70">
            Forget Me Not
          </p>
          <h1 className="text-3xl font-semibold text-zinc-100">
            Link your leaves
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
            Add ESP8266 leaves, pair senders and receivers, and watch touch
            events arrive in real time. Share the generated secrets with your
            firmware so every tap lights the partner leaf.
          </p>
        </div>
        <form action={signOut}>
          <button className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-emerald-500 hover:text-emerald-300">
            Sign out
          </button>
        </form>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-zinc-100">
              Devices
            </h2>
            <p className="text-sm text-zinc-400">
              Register each ESP8266 leaf and keep the generated secret handy for
              firmware configuration.
            </p>
          </div>

          <form action={addDevice} className="space-y-4 rounded-xl bg-zinc-950/40 p-4">
            <div className="grid gap-3">
              <label className="text-sm font-medium text-zinc-300">
                Device name
                <input
                  name="name"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="e.g. Living room leaf"
                />
              </label>

              <label className="text-sm font-medium text-zinc-300">
                Role
                <select
                  name="role"
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select role
                  </option>
                  <option value="sender">Sender (touch leaf)</option>
                  <option value="receiver">Receiver (LED leaf)</option>
                </select>
              </label>

              <label className="text-sm font-medium text-zinc-300">
                Provide your own secret (optional)
                <input
                  name="secret"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="Leave blank to auto-generate"
                />
              </label>
            </div>

            <button className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400">
              Add device
            </button>
          </form>

          <ul className="space-y-3">
            {(devices ?? []).map((device) => (
              <li
                key={device.id}
                className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-100">
                    {device.name ?? "Unnamed device"}
                  </p>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">
                    {device.role}
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">
                    Secret for firmware:
                    <span className="ml-2 select-all rounded bg-zinc-800 px-2 py-1 font-mono text-[11px] text-emerald-300">
                      {device.secret}
                    </span>
                  </p>
                </div>
                <form action={deleteDevice}>
                  <input type="hidden" name="deviceId" value={device.id} />
                  <button className="rounded-lg border border-rose-500/40 px-3 py-1 text-xs font-medium text-rose-200 transition hover:border-rose-400 hover:text-rose-100">
                    Remove
                  </button>
                </form>
              </li>
            ))}
            {!devices?.length ? (
              <li className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-sm text-zinc-400">
                No devices yet - add your first sender and receiver leaves.
              </li>
            ) : null}
          </ul>
        </article>

        <article className="flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-zinc-100">
              Pair leaves
            </h2>
            <p className="text-sm text-zinc-400">
              Link a sender and receiver leaf so touches instantly light the
              paired LED.
            </p>
          </div>

          <form action={createPair} className="space-y-4 rounded-xl bg-zinc-950/40 p-4">
            <div className="grid gap-3">
              <label className="text-sm font-medium text-zinc-300">
                Sender
                <select
                  name="senderId"
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Choose a sender
                  </option>
                  {(devices ?? [])
                    .filter((device) => device.role === "sender")
                    .map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.name ?? device.id}
                      </option>
                    ))}
                </select>
              </label>

              <label className="text-sm font-medium text-zinc-300">
                Receiver
                <select
                  name="receiverId"
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Choose a receiver
                  </option>
                  {(devices ?? [])
                    .filter((device) => device.role === "receiver")
                    .map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.name ?? device.id}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <button className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400">
              Create pair
            </button>
          </form>

          <ul className="space-y-3">
            {(pairs ?? []).map((pair) => {
              const sender = deviceMap.get(pair.sender_id);
              const receiver = deviceMap.get(pair.receiver_id);

              return (
                <li
                  key={pair.id}
                  className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">
                      {sender?.name ?? "Unnamed sender"}
                      <span className="px-1 text-zinc-500">-&gt;</span>
                      {receiver?.name ?? "Unnamed receiver"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Sender secret:{" "}
                      <span className="select-all font-mono text-[11px] text-emerald-300">
                        {sender?.secret ?? "N/A"}
                      </span>
                    </p>
                  </div>
                  <form action={deletePair}>
                    <input type="hidden" name="pairId" value={pair.id} />
                    <button className="rounded-lg border border-rose-500/40 px-3 py-1 text-xs font-medium text-rose-200 transition hover:border-rose-400 hover:text-rose-100">
                      Unlink
                    </button>
                  </form>
                </li>
              );
            })}
            {!pairs?.length ? (
              <li className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-sm text-zinc-400">
                No pairs yet - link a sender leaf to a receiver leaf.
              </li>
            ) : null}
          </ul>
        </article>
      </section>

      <section className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <article className="flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-zinc-100">
              Recent touches
            </h2>
            <p className="text-sm text-zinc-400">
              Supabase Realtime broadcasts new events - point your receiver leaf
              at the `events` channel to react instantly.
            </p>
          </div>

          <ul className="space-y-3">
            {enrichedEvents.map((event) => (
              <li
                key={event.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <p className="text-sm font-medium text-zinc-100">
                  {event.senderName}
                  <span className="px-1 text-zinc-500">touched</span>
                  <span className="px-1 text-zinc-500">-&gt;</span>
                  {event.receiverName}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {new Date(event.triggered_at).toLocaleString()}
                </p>
              </li>
            ))}
            {!enrichedEvents.length ? (
              <li className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-sm text-zinc-400">
                No events yet - flash your firmware and touch a leaf to see it
                here.
              </li>
            ) : null}
          </ul>
        </article>

        <article className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-zinc-100">
              Firmware checklist
            </h2>
            <p className="text-sm text-zinc-400">
              Configure your ESP8266 firmware with the generated credentials.
            </p>
          </div>

          <ol className="space-y-3 text-sm text-zinc-300">
            <li className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              1. Store the device secret in LittleFS/SPIFFS and send it with
              every call to the <span className="font-mono">touch-event</span>{" "}
              Edge Function.
            </li>
            <li className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              2. Include the device ID from this dashboard in your request body:
              <code className="ml-2 whitespace-nowrap rounded bg-zinc-800 px-2 py-1 font-mono text-[11px] text-emerald-300">
                {"{ deviceId, secret }"}
              </code>
            </li>
            <li className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              3. Point receiver firmware to the Supabase Realtime `events`
              channel and filter by the pair ID.
            </li>
          </ol>

          <p className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400">
            Edge Function URL (set <code className="font-mono text-[11px] text-emerald-300">NEXT_PUBLIC_TOUCH_EVENT_URL</code> in Vercel):
            <span className="mt-2 block select-all rounded bg-zinc-900 px-2 py-2 font-mono text-[11px] text-emerald-300">
              {edgeFunctionUrl}
            </span>
          </p>
        </article>
      </section>
    </main>
  );
}
